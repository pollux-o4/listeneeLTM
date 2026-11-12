import { useEffect, useRef } from 'react'
import { useText } from '../copy/index.ts'
import { icons, PixelSprite } from '../design/index.ts'
import type { BriefSummary } from '../generated/BriefSummary.ts'
import { DRAWER_ID, needsAnalysis } from './BriefDrawer.tsx'
import { href, type Route } from './route.ts'
import { SettingsMenu } from './SettingsMenu.tsx'
import type { Theme } from './theme.ts'

type Props = {
  briefs: BriefSummary[]
  drawerOpen: boolean
  onToggleDrawer: () => void
  drawerButton: React.Ref<HTMLButtonElement>
  briefId: string | undefined
  route: Route
  pendingNotes: number
  theme: Theme
  onTheme: (t: Theme) => void
}

/** 상단 이동: 지시서들 · 취향 노트 · 설정(테마·언어). 어디서든 한 번에 갈 수 있다(비차단 이동). */
export function AppBar({
  briefs,
  briefId,
  route,
  pendingNotes,
  theme,
  onTheme,
  drawerOpen,
  onToggleDrawer,
  drawerButton,
}: Props) {
  const copy = useText()
  const tabs = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLElement>(null)
  // 앱 바 높이(좁으면 두 줄)를 --bar-h로 알려, 붙어 다니는 막대·서랍이 바로 아래에 놓이게 한다.
  useEffect(() => {
    const el = bar.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--bar-h', `${el.offsetHeight}px`),
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--bar-h')
    }
  }, [])
  const todo = briefs.filter(needsAnalysis).length
  // 지시서가 많아 탭이 넘칠 때도 지금 보는 지시서의 탭이 보이게 한다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 보는 지시서나 탭 수가 바뀔 때 다시 맞춘다
  useEffect(() => {
    tabs.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [briefId, briefs.length])

  return (
    <header className="app-bar" ref={bar}>
      <a className="app-logo" href={href({ kind: 'brief' })}>
        {copy.app.navigation.name}
      </a>
      <nav className="app-nav" aria-label={copy.app.navigation.label}>
        <button
          type="button"
          ref={drawerButton}
          className="app-tab app-drawer-toggle"
          aria-expanded={drawerOpen}
          aria-controls={DRAWER_ID}
          onClick={onToggleDrawer}
        >
          <span className="app-drawer-icon" aria-hidden />
          {copy.app.drawer.open}
          {todo > 0 && (
            <span className="app-count">
              {todo}
              <span className="sr-only">{copy.app.drawer.todoSuffix}</span>
            </span>
          )}
        </button>
        <div className="app-tabs" ref={tabs}>
          {briefs.map((b) => (
            <a
              key={b.id}
              href={href({ kind: 'brief', id: b.id })}
              className="app-tab"
              aria-current={b.id === briefId ? 'page' : undefined}
            >
              <span className="app-dot" data-ready={b.ready} aria-hidden>
                {b.ready && <PixelSprite sprite={icons.check} scale={0.5} tint="currentColor" />}
              </span>
              <span className="app-tab-name">{b.title}</span>
              <span className="sr-only">
                {b.ready ? copy.app.navigation.ready : copy.app.navigation.working}
              </span>
            </a>
          ))}
        </div>
        <a
          href={href({ kind: 'notes' })}
          className="app-tab app-tab-notes"
          aria-current={route.kind === 'notes' ? 'page' : undefined}
        >
          {copy.app.navigation.notes}
          {pendingNotes > 0 && (
            <span className="app-count">
              {pendingNotes}
              <span className="sr-only">{copy.app.navigation.pendingSuffix}</span>
            </span>
          )}
        </a>
      </nav>
      <SettingsMenu theme={theme} onTheme={onTheme} />
    </header>
  )
}
