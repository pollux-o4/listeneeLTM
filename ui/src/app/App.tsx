import { useEffect } from 'react'
import { useText } from '../copy/index.ts'
import { Notice } from '../design/index.ts'
import { AppBar } from './AppBar.tsx'
import { useWorkspaceData } from './data/useWorkspaceData.ts'
import { MainScreen } from './MainScreen.tsx'
import { useRoute } from './route.ts'
import { useTheme } from './theme.ts'
import { useNotice } from './useNotice.ts'
import './app.css'

/** 앱 셸: 이동·연결 상태 배너·알림. 화면 선택은 `MainScreen`, 데이터 연결은 `useWorkspaceData`. */
export function App() {
  const copy = useText()
  const route = useRoute()
  const { theme, next } = useTheme()
  const { notice, show, close } = useNotice()
  const data = useWorkspaceData(route, show)
  const { list, prefs, brief, briefId } = data

  const pendingNotes = prefs.data?.items.filter((p) => !p.retired && !p.confirmed).length ?? 0
  const errors = [list.error, brief.error, prefs.error].filter((e) => e !== undefined)
  const neverConnected = list.error?.offline && !list.data
  const title = route.kind === 'notes' ? copy.app.shell.notesTitle : brief.data?.brief.title

  useEffect(() => {
    document.title = title ? copy.app.shell.documentTitle(title) : copy.app.shell.name
  }, [title, copy])

  return (
    <div className="app">
      <a className="app-skip" href="#main">
        {copy.app.shell.skipToContent}
      </a>
      <AppBar
        briefs={list.data ?? []}
        briefId={briefId}
        route={route}
        pendingNotes={pendingNotes}
        theme={theme}
        onNextTheme={next}
      />

      {errors.length > 0 && !neverConnected && (brief.data || route.kind === 'notes') && (
        <p className="app-banner" role="status">
          <span aria-hidden>! </span>
          {errors.some((e) => e.offline)
            ? copy.app.shell.offline
            : copy.app.shell.readFailed(errors[0]?.message)}
        </p>
      )}

      <main className="app-main" id="main" tabIndex={-1}>
        <MainScreen route={route} data={data} />
      </main>
      <Notice notice={notice} onClose={close} />
    </div>
  )
}
