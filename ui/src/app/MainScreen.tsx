import { useText } from '../copy/index.ts'
import { Mascot, PixelPanel } from '../design/index.ts'
import { BriefWorkspace } from '../features/brief/BriefWorkspace.tsx'
import { PreferenceNotes } from '../features/preferences/PreferenceNotes.tsx'
import type { useWorkspaceData } from './data/useWorkspaceData.ts'
import { href, type Route } from './route.ts'
import { WelcomeAsk } from './Welcome.tsx'

type Data = ReturnType<typeof useWorkspaceData>

/** 본문 화면 선택: 경로와 데이터 상태(연결 전·불러오는 중·없음·오류)에 맞는 한 화면. */
export function MainScreen({ route, data }: { route: Route; data: Data }) {
  const copy = useText()
  const { list, prefs, brief, patchBrief, undoBrief, patchPrefs } = data
  const briefs = list.data ?? []

  if (list.error?.offline && !list.data)
    return (
      <Empty title={copy.app.screen.offlineTitle}>
        <p>
          {copy.app.screen.terminalPrefix}
          <code>{copy.app.screen.command}</code>
          {copy.app.screen.terminalSuffix}
        </p>
      </Empty>
    )

  if (route.kind === 'notes') {
    if (prefs.data)
      return (
        <PreferenceNotes
          prefs={prefs.data}
          onPatch={patchPrefs}
          briefHref={(id) => href({ kind: 'brief', id })}
        />
      )
    if (prefs.error)
      return (
        <Empty title={copy.app.screen.notesError}>
          <p>{prefs.error.message}</p>
        </Empty>
      )
    return <Loading />
  }

  if (brief.data)
    return <BriefWorkspace view={brief.data} onPatch={patchBrief} onUndo={undoBrief} />
  if (list.data && briefs.length === 0) return <Welcome />
  if (brief.error && !brief.error.offline) {
    const missing = brief.error.status === 404
    return (
      <Empty title={missing ? copy.app.screen.missingTitle : copy.app.screen.briefError}>
        <p>{missing ? copy.app.screen.missingHint : brief.error.message}</p>
        {briefs.length > 0 && (
          <a className="ltm-link" href={href({ kind: 'brief' })}>
            {copy.app.screen.openOther}
          </a>
        )}
      </Empty>
    )
  }
  return <Loading />
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PixelPanel enter className="app-empty">
      <Mascot mood="idle" scale={4} />
      <h1 className="app-empty-title">{title}</h1>
      {children}
    </PixelPanel>
  )
}

/** 처음 연 화면: 다음에 할 한 가지(AI에게 말하기)만 보여준다. */
function Welcome() {
  const copy = useText()
  return (
    <Empty title={copy.app.screen.emptyTitle}>
      <p>{copy.app.screen.emptyHint}</p>
      <WelcomeAsk />
    </Empty>
  )
}

/** 금방 끝나는 읽기에서는 깜박이지 않게, 잠시 뒤에만 나타난다. */
function Loading() {
  const copy = useText()
  return (
    <p className="app-loading" role="status">
      {copy.app.screen.loading}
    </p>
  )
}
