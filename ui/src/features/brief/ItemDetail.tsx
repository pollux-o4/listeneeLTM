import type { AnimationEvent, CSSProperties } from 'react'
import { useText } from '../../copy/index.ts'

/** 자세히 = 설명(`- 일상어`) + 기술(`- [전문 지식]`). 비어 있어도 칸은 남겨 '없음'으로 보인다. */
const INLINE_TECH = /(\[[^\]]*\])/
const WHOLE_TECH = /^\[([^[\]]*)\]$/

function parseDetail(detail: string | null | undefined) {
  const explain: string[] = []
  const tech: string[] = []
  for (const raw of (detail ?? '').split('\n')) {
    const body = raw.trim().replace(/^- /, '')
    if (!body) continue
    const whole = WHOLE_TECH.exec(body)
    if (whole) tech.push(whole[1] ?? '')
    else explain.push(body)
  }
  return { explain, tech }
}

function Line({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE_TECH).map((part, i) =>
        part.startsWith('[') ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: 고정된 조각 순서
          <span key={i} className="ir-tech">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Row({ label, lines }: { label: string; lines: string[] }) {
  const copy = useText()
  return (
    <>
      <dt>{label}</dt>
      <dd data-empty={lines.length === 0}>
        {lines.length === 0
          ? copy.brief.item.none
          : lines.map((l) => (
              <span key={l}>
                <Line text={l} />
              </span>
            ))}
      </dd>
    </>
  )
}

type Props = {
  detail: string | null | undefined
  closing?: boolean
  order?: number
  onAnimationEnd?: (e: AnimationEvent) => void
}

export function ItemDetail({ detail, closing = false, order = 0, onAnimationEnd }: Props) {
  const copy = useText()
  const { explain, tech } = parseDetail(detail)
  return (
    <dl
      className="ir-detail"
      data-closing={closing}
      style={{ '--i': Math.min(order, 8) } as CSSProperties}
      onAnimationEnd={onAnimationEnd}
    >
      <Row label={copy.brief.item.explainLabel} lines={explain} />
      <Row label={copy.brief.item.techLabel} lines={tech} />
    </dl>
  )
}
