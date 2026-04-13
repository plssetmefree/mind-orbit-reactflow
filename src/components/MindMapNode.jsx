import { memo, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useMindMapActions } from '../MindMapContext'
import './MindMapNode.css'

function MindMapNode({ id, data, selected }) {
  const {
    editingId,
    startEdit,
    commitEdit,
    cancelEdit,
    draftLabel,
    setDraftLabel,
    tabFromEdit,
  } = useMindMapActions()
  const isEditing = editingId === id
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const label = isEditing ? draftLabel : data.label

  const onDoubleClick = (e) => {
    e.stopPropagation()
    startEdit(id)
  }

  const onKeyDown = (e) => {
    if (!isEditing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      commitEdit(id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelEdit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      tabFromEdit(id)
    }
  }

  return (
    <div
      className={`mind-map-node ${selected ? 'is-selected' : ''} ${data.isRoot ? 'is-root' : ''} ${data.collapsed ? 'is-collapsed' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="mind-map-node__handle"
      />
      <div className="mind-map-node__body">
        {isEditing ? (
          <input
            ref={inputRef}
            className="mind-map-node__input"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => commitEdit(id)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="mind-map-node__label" title={label}>
            {label || '…'}
          </span>
        )}
        {data.collapsed ? (
          <span className="mind-map-node__badge" aria-hidden>
            +
          </span>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="mind-map-node__handle"
      />
    </div>
  )
}

export default memo(MindMapNode)
