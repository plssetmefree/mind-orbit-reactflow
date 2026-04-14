import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { MindMapContext } from '../MindMapContext'
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  layoutMindMap,
  getVisibleNodeIds,
} from '../mindMapLayout'
import MindMapNode from './MindMapNode'
import FloatingActions from './FloatingActions'
import './MindOrbitCanvas.css'

const ROOT_ID = 'root'

function newNodeId() {
  return `n-${crypto.randomUUID().slice(0, 8)}`
}

function findParentId(edges, nodeId) {
  const e = edges.find((x) => x.target === nodeId)
  return e?.source ?? null
}

function insertSiblingEdge(edges, parentId, afterChildId, newId) {
  const edge = {
    id: `e-${parentId}-${newId}`,
    source: parentId,
    target: newId,
    type: 'smoothstep',
  }
  const i = edges.findIndex(
    (e) => e.source === parentId && e.target === afterChildId,
  )
  if (i === -1) return [...edges, edge]
  const copy = [...edges]
  copy.splice(i + 1, 0, edge)
  return copy
}

function collectSubtreeIds(nodeId, edges) {
  const byParent = {}
  for (const e of edges) {
    if (!byParent[e.source]) byParent[e.source] = []
    byParent[e.source].push(e.target)
  }
  const acc = new Set()
  const stack = [nodeId]
  while (stack.length) {
    const id = stack.pop()
    acc.add(id)
    for (const c of byParent[id] || []) stack.push(c)
  }
  return acc
}

function hasChildrenInTree(edges, nodeId) {
  return edges.some((e) => e.source === nodeId)
}

const initialNodes = [
  {
    id: ROOT_ID,
    type: 'mind',
    position: { x: 340, y: 300 },
    selected: true,
    data: {
      label: 'Central idea',
      isRoot: true,
      collapsed: false,
    },
  },
]

export default function MindOrbitCanvas({
  initialGraph,
  fitViewKey = 0,
  onGraphChange,
}) {
  const rf = useReactFlow()
  const hostRef = useRef(null)
  const draftRef = useRef('')
  const editingIdRef = useRef(null)
  const [nodes, setNodes] = useState(initialGraph?.nodes || initialNodes)
  const [edges, setEdges] = useState(initialGraph?.edges || [])
  const [editingId, setEditingId] = useState(null)
  const [draftLabel, setDraftLabel] = useState('')
  const edgesRef = useRef(edges)
  const pastRef = useRef([])
  const futureRef = useRef([])
  const lastSnapshotRef = useRef(
    JSON.stringify({ nodes: initialGraph?.nodes || initialNodes, edges: initialGraph?.edges || [] }),
  )
  const applyingHistoryRef = useRef(false)

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    draftRef.current = draftLabel
  }, [draftLabel])

  useEffect(() => {
    editingIdRef.current = editingId
  }, [editingId])

  useEffect(() => {
    if (fitViewKey > 0) {
      rf.fitView({ padding: 0.35, duration: 280, maxZoom: 1.1 })
    }
  }, [fitViewKey, rf])

  useEffect(() => {
    if (!onGraphChange) return
    onGraphChange({ nodes, edges })
  }, [nodes, edges, onGraphChange])

  useEffect(() => {
    const currentSnapshot = JSON.stringify({ nodes, edges })
    if (currentSnapshot === lastSnapshotRef.current) return

    if (applyingHistoryRef.current) {
      lastSnapshotRef.current = currentSnapshot
      applyingHistoryRef.current = false
      return
    }

    pastRef.current.push(lastSnapshotRef.current)
    if (pastRef.current.length > 100) {
      pastRef.current.shift()
    }
    futureRef.current = []
    lastSnapshotRef.current = currentSnapshot
  }, [nodes, edges])

  const undo = useCallback(() => {
    const previous = pastRef.current.pop()
    if (!previous) return
    futureRef.current.push(lastSnapshotRef.current)
    const parsed = JSON.parse(previous)
    applyingHistoryRef.current = true
    lastSnapshotRef.current = previous
    setNodes(parsed.nodes || [])
    setEdges(parsed.edges || [])
  }, [])

  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current.push(lastSnapshotRef.current)
    const parsed = JSON.parse(next)
    applyingHistoryRef.current = true
    lastSnapshotRef.current = next
    setNodes(parsed.nodes || [])
    setEdges(parsed.edges || [])
  }, [])

  const selectedId = useMemo(
    () => nodes.find((n) => n.selected)?.id ?? null,
    [nodes],
  )

  const applyLayout = useCallback((nextNodes, nextEdges) => {
    const visible = getVisibleNodeIds(ROOT_ID, nextNodes, nextEdges)
    return layoutMindMap(ROOT_ID, nextNodes, nextEdges, visible)
  }, [])

  const nudgeIntoView = useCallback(
    (nodeId) => {
      requestAnimationFrame(() => {
        const node = rf.getNode(nodeId)
        const host = hostRef.current
        if (!node || !host) return

        const w = node.measured?.width ?? NODE_WIDTH
        const h = node.measured?.height ?? NODE_HEIGHT
        const tl = rf.flowToScreenPosition({
          x: node.position.x,
          y: node.position.y,
        })
        const br = rf.flowToScreenPosition({
          x: node.position.x + w,
          y: node.position.y + h,
        })
        const pad = 72
        const rect = host.getBoundingClientRect()
        let sx = 0
        let sy = 0
        if (tl.x < rect.left + pad) sx = tl.x - (rect.left + pad)
        if (br.x > rect.right - pad) sx = br.x - (rect.right - pad)
        if (tl.y < rect.top + pad) sy = tl.y - (rect.top + pad)
        if (br.y > rect.bottom - pad) sy = br.y - (rect.bottom - pad)
        if (sx !== 0 || sy !== 0) {
          const v = rf.getViewport()
          rf.setViewport(
            { x: v.x - sx, y: v.y - sy, zoom: v.zoom },
            { duration: 200 },
          )
        }
      })
    },
    [rf],
  )

  const commitEdit = useCallback((id) => {
    if (editingIdRef.current !== id) return
    editingIdRef.current = null
    setEditingId(null)
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                label: (draftRef.current ?? '').trim() || n.data.label,
              },
            }
          : n,
      ),
    )
  }, [])

  const cancelEdit = useCallback(() => {
    editingIdRef.current = null
    setEditingId(null)
  }, [])

  const startEdit = useCallback(
    (id) => {
      const n = nodes.find((x) => x.id === id)
      if (!n) return
      setDraftLabel(n.data.label ?? '')
      editingIdRef.current = id
      setEditingId(id)
    },
    [nodes],
  )

  const addChild = useCallback(
    (parentId) => {
      const id = newNodeId()
      const edge = {
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
      }
      const newNode = {
        id,
        type: 'mind',
        position: { x: 0, y: 0 },
        selected: true,
        data: { label: 'New idea', isRoot: false, collapsed: false },
      }
      setEdges((e) => {
        const nextEdges = [...e, edge]
        setNodes((nds) => {
          const next = [
            ...nds.map((n) => ({ ...n, selected: n.id === id })),
            newNode,
          ]
          return applyLayout(next, nextEdges)
        })
        return nextEdges
      })
      editingIdRef.current = null
      setEditingId(null)
      setTimeout(() => nudgeIntoView(id), 60)
    },
    [applyLayout, nudgeIntoView],
  )

  const addSibling = useCallback(
    (fromId) => {
      if (fromId === ROOT_ID) {
        addChild(ROOT_ID)
        return
      }
      setEdges((e) => {
        const parentId = findParentId(e, fromId)
        if (!parentId) return e
        const id = newNodeId()
        const nextEdges = insertSiblingEdge(e, parentId, fromId, id)
        const newNode = {
          id,
          type: 'mind',
          position: { x: 0, y: 0 },
          selected: true,
          data: { label: 'New idea', isRoot: false, collapsed: false },
        }
        setNodes((nds) => {
          const next = [
            ...nds.map((n) => ({ ...n, selected: n.id === id })),
            newNode,
          ]
          return applyLayout(next, nextEdges)
        })
        editingIdRef.current = null
        setEditingId(null)
        setTimeout(() => nudgeIntoView(id), 60)
        return nextEdges
      })
    },
    [addChild, applyLayout, nudgeIntoView],
  )

  const deleteSubtree = useCallback(
    (nodeId) => {
      if (nodeId === ROOT_ID) return
      setEdges((e) => {
        const parentId = findParentId(e, nodeId)
        const remove = collectSubtreeIds(nodeId, e)
        const nextEdges = e.filter(
          (ed) => !remove.has(ed.source) && !remove.has(ed.target),
        )
        setNodes((nds) => {
          const nextNodes = nds.filter((n) => !remove.has(n.id))
          const laid = applyLayout(nextNodes, nextEdges)
          return laid.map((n) => ({
            ...n,
            selected: n.id === (parentId ?? ROOT_ID),
          }))
        })
        editingIdRef.current = null
        setEditingId(null)
        return nextEdges
      })
    },
    [applyLayout],
  )

  const toggleCollapse = useCallback((nodeId) => {
    const e = edgesRef.current
    if (!hasChildrenInTree(e, nodeId)) return
    setNodes((nds) => {
      const next = nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } }
          : n,
      )
      const visible = getVisibleNodeIds(ROOT_ID, next, e)
      return layoutMindMap(ROOT_ID, next, e, visible)
    })
  }, [])

  const tabFromEdit = useCallback(
    (id) => {
      commitEdit(id)
      setTimeout(() => addChild(id), 0)
    },
    [addChild, commitEdit],
  )

  const contextValue = useMemo(
    () => ({
      editingId,
      draftLabel,
      setDraftLabel,
      startEdit,
      commitEdit,
      cancelEdit,
      tabFromEdit,
    }),
    [editingId, draftLabel, startEdit, commitEdit, cancelEdit, tabFromEdit],
  )

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (e.target.closest('input, textarea, select')) return
      if (!selectedId) return
      if (e.key === 'Enter') {
        e.preventDefault()
        addSibling(selectedId)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        addChild(selectedId)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSubtree(selectedId)
      } else if (e.key === 'F2') {
        e.preventDefault()
        startEdit(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addChild, addSibling, deleteSubtree, redo, selectedId, startEdit, undo])

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  const visibleIds = useMemo(
    () => getVisibleNodeIds(ROOT_ID, nodes, edges),
    [nodes, edges],
  )

  const nodesForFlow = useMemo(
    () =>
      nodes.map((n) => {
        const visible = visibleIds.has(n.id)
        return {
          ...n,
          hidden: !visible,
          selectable: visible,
          draggable: visible,
        }
      }),
    [nodes, visibleIds],
  )

  const edgesForFlow = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        hidden:
          !visibleIds.has(e.source) || !visibleIds.has(e.target),
      })),
    [edges, visibleIds],
  )

  const nodeTypes = useMemo(() => ({ mind: MindMapNode }), [])

  const selectedHasKids = selectedId
    ? hasChildrenInTree(edges, selectedId)
    : false
  const selectedCollapsed = selectedId
    ? nodes.find((n) => n.id === selectedId)?.data?.collapsed
    : false

  const onInit = useCallback(() => {
    rf.fitView({ padding: 0.35, duration: 0, maxZoom: 1.1 })
  }, [rf])

  return (
    <MindMapContext.Provider value={contextValue}>
      <div className="mind-orbit__canvas-wrap" ref={hostRef}>
        <ReactFlow
          nodes={nodesForFlow}
          edges={edgesForFlow}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          minZoom={0.25}
          maxZoom={1.75}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: {
              stroke: 'var(--mo-edge)',
              strokeWidth: 1.5,
            },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="var(--mo-grid)"
          />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>

        <FloatingActions
          disabled={!selectedId}
          canCollapse={selectedHasKids}
          canDelete={!!selectedId && selectedId !== ROOT_ID}
          isCollapsed={!!selectedCollapsed}
          onAddChild={() => selectedId && addChild(selectedId)}
          onAddSibling={() => selectedId && addSibling(selectedId)}
          onDelete={() => selectedId && deleteSubtree(selectedId)}
          onToggleCollapse={() => selectedId && toggleCollapse(selectedId)}
        />
      </div>
    </MindMapContext.Provider>
  )
}
