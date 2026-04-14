import './AppToolbar.css'

export default function AppToolbar({
  theme,
  maps,
  activeMapId,
  saveText,
  onSelectMap,
  onCreateMap,
  onSaveNow,
  onToggleTheme,
  onFitView,
}) {
  return (
    <header className="app-toolbar">
      <div className="app-toolbar__brand">
        <span className="app-toolbar__logo" aria-hidden>
          ◉
        </span>
        <div>
          <h1 className="app-toolbar__name">Mind Orbit</h1>
          <p className="app-toolbar__tagline">Ideas in gentle orbit</p>
        </div>
      </div>
      <div className="app-toolbar__actions">
        <select
          className="app-toolbar__select"
          value={activeMapId ?? ''}
          onChange={(e) => onSelectMap(e.target.value)}
        >
          {maps.map((map) => (
            <option key={map.id} value={map.id}>
              {map.name}
            </option>
          ))}
        </select>
        <button type="button" className="app-toolbar__btn" onClick={onCreateMap}>
          New map
        </button>
        <button type="button" className="app-toolbar__btn" onClick={onSaveNow}>
          Save
        </button>
        <button type="button" className="app-toolbar__btn" onClick={onFitView}>
          Reset view
        </button>
        <button
          type="button"
          className="app-toolbar__btn app-toolbar__btn--accent"
          onClick={onToggleTheme}
          title="Toggle light / cosmic dark"
        >
          {theme === 'light' ? 'Cosmic' : 'Light'}
        </button>
        <span className="app-toolbar__status">{saveText}</span>
      </div>
    </header>
  )
}
