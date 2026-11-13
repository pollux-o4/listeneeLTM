import { useEffect, useState } from 'react'
import './switcher.css'

export type VariantMeta = { key: string; name: string }

type Props = {
  variants: VariantMeta[]
  current: string
  onChange: (key: string) => void
  theme: 'light' | 'dark'
  onTheme: () => void
  state: unknown
  onReset: () => void
}

const typing = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  (el as HTMLElement | null)?.isContentEditable

/** PROTOTYPE 전용 하단 전환 바. 평가 대상 디자인과 구분되는 고대비 알약 모양. */
export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  theme,
  onTheme,
  state,
  onReset,
}: Props) {
  const [showState, setShowState] = useState(false)
  const i = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )
  const go = (d: number) =>
    onChange((variants[(i + d + variants.length) % variants.length] as VariantMeta).key)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(document.activeElement) || e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (import.meta.env.PROD) return null
  const v = variants[i] as VariantMeta
  return (
    <>
      {showState && (
        <pre className="ps-state">
          {JSON.stringify(state, (k, val) => (k === 'history' ? `[${val.length}]` : val), 2)}
        </pre>
      )}
      <div className="ps" role="toolbar" aria-label="프로토타입 시안 전환">
        <button type="button" onClick={() => go(-1)} aria-label="이전 시안">
          ←
        </button>
        <span className="ps-label">
          {v.key} <small>({v.name})</small>
        </span>
        <button type="button" onClick={() => go(1)} aria-label="다음 시안">
          →
        </button>
        <span className="ps-sep" />
        <button type="button" onClick={onTheme}>
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        <button type="button" onClick={() => setShowState(!showState)} aria-pressed={showState}>
          state
        </button>
        <button type="button" onClick={onReset}>
          reset
        </button>
      </div>
    </>
  )
}
