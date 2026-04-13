export const NODE_WIDTH = 196
export const NODE_HEIGHT = 48
export const H_GAP = 228
export const V_GAP = 18

export function buildChildrenMap(edges, visibleIds) {
  const map = {}
  for (const e of edges) {
    if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) continue
    if (!map[e.source]) map[e.source] = []
    map[e.source].push(e.target)
  }
  return map
}

export function getVisibleNodeIds(rootId, nodes, edges) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const childrenByParent = {}
  for (const e of edges) {
    if (!childrenByParent[e.source]) childrenByParent[e.source] = []
    childrenByParent[e.source].push(e.target)
  }

  const visible = new Set([rootId])
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()
    if (byId[id]?.data?.collapsed) continue
    const kids = childrenByParent[id] || []
    for (const c of kids) {
      if (!visible.has(c)) {
        visible.add(c)
        stack.push(c)
      }
    }
  }
  return visible
}

function subtreeHeight(nodeId, childrenMap, visibleIds) {
  const kids = (childrenMap[nodeId] || []).filter((id) => visibleIds.has(id))
  if (kids.length === 0) return NODE_HEIGHT
  let sum = 0
  kids.forEach((cid, i) => {
    sum += subtreeHeight(cid, childrenMap, visibleIds)
    if (i < kids.length - 1) sum += V_GAP
  })
  return Math.max(NODE_HEIGHT, sum)
}

export function layoutMindMap(rootId, nodes, edges, visibleIds) {
  const childrenMap = buildChildrenMap(edges, visibleIds)
  const nodesById = Object.fromEntries(nodes.map((n) => [n.id, { ...n }]))

  function place(nodeId, centerY, leftX) {
    const n = nodesById[nodeId]
    if (!n) return
    n.position = {
      x: leftX,
      y: centerY - NODE_HEIGHT / 2,
    }

    const kids = (childrenMap[nodeId] || []).filter((id) => visibleIds.has(id))
    if (kids.length === 0) return

    const heights = kids.map((cid) => subtreeHeight(cid, childrenMap, visibleIds))
    const total =
      heights.reduce((a, b) => a + b, 0) + (kids.length - 1) * V_GAP
    let y = centerY - total / 2

    kids.forEach((cid, i) => {
      const h = heights[i]
      const cy = y + h / 2
      place(cid, cy, leftX + H_GAP)
      y += h + V_GAP
    })
  }

  const root = nodesById[rootId]
  if (!root) return nodes
  const cy = root.position.y + NODE_HEIGHT / 2
  place(rootId, cy, root.position.x)

  return Object.values(nodesById)
}
