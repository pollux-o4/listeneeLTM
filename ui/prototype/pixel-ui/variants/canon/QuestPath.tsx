import type { CSSProperties } from 'react'
import type { BriefState } from '../../model/brief.ts'
import { PixelSprite } from '../../primitives/index.tsx'
import { Mascot } from '../../scenes/Mascot.tsx'
import type { ListeneeMood } from '../../sprites/listenee.ts'
import { chest } from '../../sprites/props.ts'
import { currentStage, stageStatus } from './stage.ts'

const GLYPH = { fork: '?', empty: '!', review: '○', clear: '✓' } as const
const STATUS_TEXT = {
  fork: '정할 것 있음',
  empty: '비어 있음',
  review: '확인 전 항목 있음',
  clear: '완료',
} as const

type Props = {
  state: BriefState
  open: number
  onOpen: (i: number) => void
  ready: boolean
  mood: ListeneeMood
}

/** 여정 길: 단계 타일 + 걷는 마스코트 + 끝의 전달 상자. (B) */
export function QuestPath({ state, open, onOpen, ready, mood }: Props) {
  const here = currentStage(state)
  return (
    <ol className="cn-path" style={{ '--n': state.sections.length + 1 } as CSSProperties}>
      <li className="cn-walker" style={{ '--at': here } as CSSProperties} aria-hidden>
        <Mascot mood={mood} scale={2} />
      </li>
      {state.sections.map((s, i) => {
        const st = stageStatus(state, s.key)
        const unconfirmed = s.items.filter((it) => !it.confirmed).length
        return (
          <li key={s.key}>
            <button
              type="button"
              className="cn-node"
              data-state={st}
              aria-current={open === i ? 'step' : undefined}
              aria-label={`${i + 1}단계 ${s.label}: ${STATUS_TEXT[st]}`}
              onClick={() => onOpen(i)}
            >
              <span className="cn-tile" aria-hidden>
                {GLYPH[st]}
                {unconfirmed > 0 && st !== 'fork' && (
                  <span className="cn-count">{unconfirmed}</span>
                )}
              </span>
              <span className="cn-name">{s.label}</span>
            </button>
          </li>
        )
      })}
      <li>
        <button
          type="button"
          className="cn-node cn-goal"
          data-state={ready ? 'clear' : 'locked'}
          aria-current={open === state.sections.length ? 'step' : undefined}
          aria-label={ready ? '전달: 지시서 완성' : '전달: 아직 잠김'}
          onClick={() => onOpen(state.sections.length)}
        >
          <PixelSprite sprite={ready ? chest.open : chest.closed} scale={2} />
          <span className="cn-name">전달</span>
        </button>
      </li>
    </ol>
  )
}
