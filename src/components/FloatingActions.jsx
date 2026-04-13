import './FloatingActions.css'

export default function FloatingActions({
  disabled,
  canCollapse,
  isCollapsed,
  canDelete,
  onAddChild,
  onAddSibling,
  onDelete,
  onToggleCollapse,
}) {
  return (
    <aside className="floating-actions" aria-label="Node actions">
      <div className="floating-actions__title">Selection</div>
      <p className="floating-actions__hint">Rename: double-click or F2</p>
      <button
        type="button"
        className="floating-actions__btn"
        disabled={disabled}
        onClick={onAddChild}
      >
        Child
        <kbd>Tab</kbd>
      </button>
      <button
        type="button"
        className="floating-actions__btn"
        disabled={disabled}
        onClick={onAddSibling}
      >
        Sibling
        <kbd>↵</kbd>
      </button>
      <button
        type="button"
        className="floating-actions__btn"
        disabled={disabled || !canCollapse}
        onClick={onToggleCollapse}
      >
        {isCollapsed ? 'Expand' : 'Collapse'}
      </button>
      <button
        type="button"
        className="floating-actions__btn floating-actions__btn--danger"
        disabled={disabled || !canDelete}
        onClick={onDelete}
      >
        Delete
      </button>
    </aside>
  )
}
