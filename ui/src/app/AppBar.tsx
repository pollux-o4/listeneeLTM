import { useEffect, useRef } from 'react'
import { useLocale, useText } from '../copy/index.ts'
import { icons, PixelSprite } from '../design/index.ts'
import type { BriefSummary } from '../generated/BriefSummary.ts'
import { href, type Route } from './route.ts'
import type { Theme } from './theme.ts'

type Props = {
  briefs: BriefSummary[]
  briefId: string | undefined
  route: Route
  pendingNotes: number
  theme: Theme
  onNextTheme: () => void
}

/** 상단 이동: 지시서들 · 취향 노트 · 테마. 어디서든 한 번에 갈 수 있다(비차단 이동). */
export function AppBar({ briefs, briefId, route, pendingNotes, theme, onNextTheme }: Props) {
  const copy = useText()
  const { locale, setLocale } = useLocale()
  const tabs = useRef<HTMLDivElement>(null)
  // 지시서가 많아 탭이 넘칠 때도 지금 보는 지시서의 탭이 보이게 한다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 보는 지시서나 탭 수가 바뀔 때 다시 맞춘다
  useEffect(() => {
    tabs.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [briefId, briefs.length])

  return (
    <header className="app-bar">
      <a className="app-logo" href={href({ kind: 'brief' })}>
        {copy.app.navigation.name}
      </a>
      <nav className="app-nav" aria-label={copy.app.navigation.label}>
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
      <button
        type="button"
        className="app-theme"
        onClick={onNextTheme}
        aria-label={copy.app.navigation.themeLabel(copy.app.navigation.theme[theme])}
        title={copy.app.navigation.themeTitle}
      >
        <span className="app-theme-swatch" data-theme-choice={theme} aria-hidden />
        {copy.app.navigation.theme[theme]}
      </button>
      <select
        className="app-language"
        aria-label={copy.app.navigation.language}
        value={locale}
        onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'ko')}
      >
        <option value="ko" lang="ko">
          {copy.app.navigation.languages.ko}
        </option>
        <option value="en" lang="en">
          {copy.app.navigation.languages.en}
        </option>
      </select>
    </header>
  )
}
