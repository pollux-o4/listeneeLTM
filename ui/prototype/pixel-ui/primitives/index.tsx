import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import './primitives.css'
import { useReducedMotion } from './useReducedMotion.ts'

export { PixelSprite } from './PixelSprite.tsx'

type PanelProps = {
  children: ReactNode
  tone?: 'plain' | 'accent'
  enterIndex?: number
  className?: string
}

export function PixelPanel({ children, tone = 'plain', enterIndex, className = '' }: PanelProps) {
  const enter = enterIndex === undefined ? '' : 'px-enter'
  return (
    <div
      className={`px-panel ${enter} ${className}`}
      data-tone={tone}
      style={{ '--i': enterIndex ?? 0 } as CSSProperties}
    >
      {children}
    </div>
  )
}

export function PixelButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`px-button ${props.className ?? ''}`} />
}

export function PixelMeter({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: 세그먼트 표현을 위해 div에 meter 역할을 준다
    <div
      className="px-meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      data-full={value >= max}
      style={{ '--segments': max } as CSSProperties}
    >
      {Array.from({ length: max }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 고정 길이 세그먼트
        <span key={i} data-on={i < value} style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  )
}

/** 한 글자씩 드러나는 말풍선. 스크린리더에는 전체 문장을 즉시 알린다. */
export function SpeechBubble({ text, cps = 28 }: { text: string; cps?: number }) {
  const reduced = useReducedMotion()
  const chars = Array.from(text)
  const [shown, setShown] = useState(reduced ? chars.length : 0)

  useEffect(() => {
    if (reduced) return setShown(chars.length)
    setShown(0)
    const timer = setInterval(() => setShown((n) => (n >= chars.length ? n : n + 1)), 1000 / cps)
    return () => clearInterval(timer)
  }, [chars.length, cps, reduced])

  return (
    <p className="px-bubble" aria-live="polite">
      <span aria-hidden>{chars.slice(0, shown).join('')}</span>
      <span className="sr-only">{text}</span>
      {shown < chars.length && <span className="px-caret" aria-hidden />}
    </p>
  )
}
