import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import AppToolbar from './components/AppToolbar'
import MindOrbitCanvas from './components/MindOrbitCanvas'
import './App.css'

const STORAGE_KEY = 'mind-orbit.maps.v1'
const ACTIVE_MAP_KEY = 'mind-orbit.active-map.v1'

function createInitialGraph(name) {
  return {
    nodes: [
      {
        id: 'root',
        type: 'mind',
        position: { x: 340, y: 300 },
        selected: true,
        data: {
          label: name || 'Central idea',
          isRoot: true,
          collapsed: false,
        },
      },
    ],
    edges: [],
  }
}

function createMap(name) {
  const now = Date.now()
  return {
    id: `map-${crypto.randomUUID().slice(0, 8)}`,
    name,
    graph: createInitialGraph(name),
    updatedAt: now,
    createdAt: now,
  }
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const activeId = localStorage.getItem(ACTIVE_MAP_KEY)
    if (!raw) return { maps: [], activeId: null }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { maps: [], activeId: null }
    return { maps: parsed, activeId }
  } catch {
    return { maps: [], activeId: null }
  }
}

export default function App() {
  const initialStored = useMemo(() => readStorage(), [])
  const [theme, setTheme] = useState('light')
  const [fitViewKey, setFitViewKey] = useState(0)
  const [maps, setMaps] = useState(initialStored.maps)
  const [activeMapId, setActiveMapId] = useState(() => {
    if (
      initialStored.activeId &&
      initialStored.maps.some((m) => m.id === initialStored.activeId)
    ) {
      return initialStored.activeId
    }
    return initialStored.maps[0]?.id ?? null
  })
  const [draftName, setDraftName] = useState('')
  const [saveStamp, setSaveStamp] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps))
    if (activeMapId) {
      localStorage.setItem(ACTIVE_MAP_KEY, activeMapId)
    }
  }, [maps, activeMapId])

  const activeMap = useMemo(
    () => maps.find((m) => m.id === activeMapId) ?? null,
    [maps, activeMapId],
  )

  const createNewMindMap = useCallback(
    (name) => {
      const safeName = (name || '').trim() || '새 마인드맵'
      const map = createMap(safeName)
      setMaps((prev) => [map, ...prev])
      setActiveMapId(map.id)
      setFitViewKey((k) => k + 1)
      setSaveStamp(Date.now())
      setDraftName('')
    },
    [],
  )

  const onGraphChange = useCallback((graph) => {
    setMaps((prev) =>
      prev.map((map) =>
        map.id === activeMapId
          ? {
              ...map,
              graph,
              updatedAt: Date.now(),
            }
          : map,
      ),
    )
  }, [activeMapId])

  const saveNow = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps))
    if (activeMapId) {
      localStorage.setItem(ACTIVE_MAP_KEY, activeMapId)
    }
    setSaveStamp(Date.now())
  }, [maps, activeMapId])

  const saveText = saveStamp
    ? `저장됨 ${new Date(saveStamp).toLocaleTimeString()}`
    : '자동저장 사용 중'

  return (
    <div className="app-shell" data-theme={theme}>
      {maps.length === 0 ? (
        <section className="onboarding">
          <div className="onboarding__card">
            <h2>Mind Orbit 시작하기</h2>
            <p>새 마인드맵을 만들면 자동 저장이 바로 활성화됩니다.</p>
            <form
              className="onboarding__form"
              onSubmit={(e) => {
                e.preventDefault()
                createNewMindMap(draftName)
              }}
            >
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="마인드맵 이름을 입력하세요"
              />
              <button type="submit">새 마인드맵 만들기</button>
            </form>
          </div>
        </section>
      ) : (
        <ReactFlowProvider>
          <AppToolbar
            theme={theme}
            maps={maps}
            activeMapId={activeMapId}
            saveText={saveText}
            onSelectMap={setActiveMapId}
            onCreateMap={() => createNewMindMap('새 마인드맵')}
            onSaveNow={saveNow}
            onToggleTheme={() =>
              setTheme((t) => (t === 'light' ? 'dark' : 'light'))
            }
            onFitView={() => setFitViewKey((k) => k + 1)}
          />
          {activeMap ? (
            <MindOrbitCanvas
              key={activeMap.id}
              mapId={activeMap.id}
              initialGraph={activeMap.graph}
              fitViewKey={fitViewKey}
              onGraphChange={onGraphChange}
            />
          ) : null}
        </ReactFlowProvider>
      )}
    </div>
  )
}
