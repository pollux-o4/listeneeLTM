import type { BriefState, SectionKey } from '../../model/brief.ts'

/** 단계 상태 판정: 길·상세·말풍선이 같은 규칙을 쓴다. 우선순위 fork > empty > review > clear. */
export type StageStatus = 'fork' | 'empty' | 'review' | 'clear'

export function stageStatus(state: BriefState, key: SectionKey): StageStatus {
  const sec = state.sections.find((s) => s.key === key)
  if (state.decisions.some((d) => d.section === key && !d.chosen)) return 'fork'
  if (sec?.required && !sec.items.length) return 'empty'
  if (sec?.items.some((i) => !i.confirmed)) return 'review'
  return 'clear'
}

/** 마스코트가 서 있을 곳: 막힌(fork·empty) 첫 단계. 모두 통과면 도착(=단계 수). */
export function currentStage(state: BriefState): number {
  const i = state.sections.findIndex((s) => {
    const st = stageStatus(state, s.key)
    return st === 'fork' || st === 'empty'
  })
  return i === -1 ? state.sections.length : i
}
