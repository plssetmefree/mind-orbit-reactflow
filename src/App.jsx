import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import AppToolbar from './components/AppToolbar'
import MindOrbitCanvas from './components/MindOrbitCanvas'
import './App.css'

export default function App() {
  const [theme, setTheme] = useState('light')
  const [fitViewKey, setFitViewKey] = useState(0)

  return (
    <div className="app-shell" data-theme={theme}>
      <ReactFlowProvider>
        <AppToolbar
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) => (t === 'light' ? 'dark' : 'light'))
          }
          onFitView={() => setFitViewKey((k) => k + 1)}
        />
        <MindOrbitCanvas fitViewKey={fitViewKey} />
      </ReactFlowProvider>
    </div>
  )
}
