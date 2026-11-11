import type { CSSProperties } from 'react'
import { useText } from '../../copy/index.ts'
import { chest, type ListeneeMood, Mascot, PixelSprite, SpeechBubble } from '../../design/index.ts'
import type { StageView } from '../../generated/StageView.ts'
import { StatusGlyph } from './status.tsx'
import './quest-path.css'

type Props = {
  stages: StageView[]
  current: number
  ready: boolean
  open: number
  mood: ListeneeMood
  say: string
  onOpen: (index: number) => void
}

/**
 * 여정 길: 단계 타일 + 마스코트 + 전달 상자. 어느 단계든 언제나 열 수 있다(잠금 없음).
 * 마스코트는 막힌 단계 위에 서서 그 자리에서 말한다. 이동은 transform만 써서 레이아웃을 다시 계산하지 않는다.
 */
export function QuestPath({ stages, current, ready, open, mood, say, onOpen }: Props) {
  const copy = useText()
  const n = stages.length + 1
  // 말풍선은 마스코트 옆 넓은 쪽에 둔다.
  const side = current < n / 2 ? 'after' : 'before'
  const bubbleColumns = side === 'after' ? `${current + 2} / -1` : `1 / ${current + 1}`
  return (
    <section className="qp" style={{ '--n': n, '--at': current } as CSSProperties}>
      <div className="qp-rail">
        <div className="qp-walker" aria-hidden>
          <Mascot mood={mood} scale={2} />
        </div>
        <div className="qp-say" data-side={side} style={{ gridColumn: bubbleColumns }}>
          <SpeechBubble text={say} tail={side === 'after' ? 'left' : 'right'} />
        </div>
      </div>
      <nav aria-label={copy.brief.path.label}>
        <ol className="qp-list">
          {stages.map((s, i) => (
            <li key={s.section}>
              <button
                type="button"
                className="qp-node"
                data-status={s.status}
                aria-current={open === i ? 'step' : undefined}
                aria-label={copy.brief.path.stageLabel(
                  i + 1,
                  copy.brief.stage[s.section].label,
                  copy.brief.status[s.status],
                  s.unconfirmed,
                )}
                onClick={() => onOpen(i)}
              >
                <span className="qp-tile" aria-hidden>
                  <StatusGlyph status={s.status} />
                  {s.status !== 'fork' && s.unconfirmed > 0 && (
                    <span className="qp-count">{s.unconfirmed}</span>
                  )}
                </span>
                <span className="qp-name">{copy.brief.stage[s.section].label}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="qp-node qp-goal"
              data-status={ready ? 'clear' : 'locked'}
              aria-current={open === stages.length ? 'step' : undefined}
              aria-label={ready ? copy.brief.path.ready : copy.brief.path.blocked}
              onClick={() => onOpen(stages.length)}
            >
              <span className="qp-chest" aria-hidden>
                <PixelSprite sprite={ready ? chest.open : chest.closed} scale={4 / 3} />
              </span>
              <span className="qp-name">{copy.brief.path.delivery}</span>
            </button>
          </li>
        </ol>
      </nav>
    </section>
  )
}
