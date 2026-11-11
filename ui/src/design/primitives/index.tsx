import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import './primitives.css'
import { useReducedMotion } from './useReducedMotion.ts'

export { InlineEdit, useEditToggle } from './InlineEdit.tsx'
export { Notice, type NoticeContent } from './Notice.tsx'
export { OriginBadge } from './OriginBadge.tsx'
export { PixelSprite } from './PixelSprite.tsx'
export { type CopyState, useCopy } from './useCopy.ts'
export { useReducedMotion }

type PanelProps = {
  children: ReactNode
  tone?: 'plain' | 'accent'
  enter?: boolean
  className?: string
}

/** 계단 모서리 패널. `enter`면 나타날 때 떠오른다. */
export function PixelPanel({
  children,
  tone = 'plain',
  enter = false,
  className = '',
}: PanelProps) {
  return (
    <div className={`ltm-panel ${className}`} data-tone={tone} data-enter={enter}>
      {children}
    </div>
  )
}

type ButtonProps = ComponentProps<'button'> & { variant?: 'plain' | 'primary' }

export function PixelButton({ variant = 'plain', className = '', ...props }: ButtonProps) {
  return (
    <button type="button" {...props} data-variant={variant} className={`ltm-button ${className}`} />
  )
}

/**
 * 한 글자씩 드러나는 말풍선. 보조기기에는 전체 문장을 한 번에 알린다.
 * 알림 영역은 문장이 바뀌어도 그대로 남아 있어야 바뀐 문장이 읽힌다(매번 새로 만들면 읽히지 않는다).
 */
export function SpeechBubble({
  text,
  cps = 48,
  tail = 'left',
}: {
  text: string
  cps?: number
  tail?: 'left' | 'right' | 'none'
}) {
  const reduced = useReducedMotion()
  const chars = Array.from(text)
  const [typed, setTyped] = useState({ text, shown: reduced ? chars.length : 0 })
  const shown = typed.text === text ? typed.shown : 0

  useEffect(() => {
    const total = Array.from(text).length
    if (reduced) {
      setTyped({ text, shown: total })
      return
    }
    setTyped({ text, shown: 0 })
    const timer = setInterval(
      () =>
        setTyped((t) => {
          if (t.shown >= total) clearInterval(timer)
          return t.shown >= total ? t : { text, shown: t.shown + 1 }
        }),
      1000 / cps,
    )
    return () => clearInterval(timer)
  }, [text, cps, reduced])

  return (
    <p className="ltm-bubble" data-tail={tail}>
      {/* 자리를 미리 잡아 글자가 찍히는 동안 풍선 크기가 변하지 않게 한다. */}
      <span className="ltm-bubble-ghost" aria-hidden>
        {text}
      </span>
      <span className="ltm-bubble-typed" aria-hidden>
        {chars.slice(0, shown).join('')}
        {shown < chars.length && <span className="ltm-caret" />}
      </span>
      <span className="sr-only" aria-live="polite">
        {text}
      </span>
    </p>
  )
}
