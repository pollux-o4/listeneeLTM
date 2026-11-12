import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useText } from '../copy/index.ts'
import { icons, PixelSprite, usePresence } from '../design/index.ts'
import type { Locale } from '../generated/Locale.ts'
import { THEMES, type Theme } from './theme.ts'

const LOCALES = ['ko', 'en'] as const satisfies readonly Locale[]

type Props = { theme: Theme; onTheme: (t: Theme) => void }

/** 톱니바퀴: 테마·언어처럼 가끔 바꾸는 화면 설정을 한곳에 둔다. 바깥 클릭·Esc로 닫힌다. */
export function SettingsMenu({ theme, onTheme }: Props) {
  const copy = useText()
  const nav = copy.app.navigation
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const panel = usePresence(open)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="app-settings" ref={root}>
      <button
        type="button"
        ref={button}
        className="ltm-icon app-settings-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={nav.settings}
        title={nav.settings}
        onClick={() => setOpen((o) => !o)}
      >
        <PixelSprite sprite={icons.gear} scale={2 / 3} tint="currentColor" />
      </button>
      {panel.mounted && (
        <div
          className="app-settings-panel"
          id={panelId}
          data-closing={panel.closing}
          onAnimationEnd={panel.onAnimationEnd}
        >
          <fieldset>
            <legend className="ltm-label">{nav.themeHeading}</legend>
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                className="app-choice"
                aria-pressed={theme === t}
                onClick={() => onTheme(t)}
              >
                <span className="app-theme-swatch" data-theme-choice={t} aria-hidden />
                {nav.theme[t]}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend className="ltm-label">{nav.language}</legend>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                className="app-choice"
                aria-pressed={locale === l}
                onClick={() => setLocale(l)}
              >
                {nav.languages[l]}
              </button>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  )
}
