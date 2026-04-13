import './AppToolbar.css'

export default function AppToolbar({ theme, onToggleTheme, onFitView }) {
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
      </div>
    </header>
  )
}
