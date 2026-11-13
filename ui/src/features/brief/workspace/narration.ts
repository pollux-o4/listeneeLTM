import type { Messages } from '../../../copy/index.ts'
import type { ListeneeMood } from '../../../design/index.ts'
import type { BriefView } from '../../../generated/BriefView.ts'

/** 마스코트 말풍선과 표정: 판정 결과를 사람 말로 옮긴다(판정 자체는 코어). */
export function narrate(view: BriefView, copy: Messages): { mood: ListeneeMood; say: string } {
  const review = view.stages.reduce((n, s) => n + s.unconfirmed, 0)
  if (view.brief.revision === 0) {
    return { mood: 'idle', say: copy.brief.narration.initial }
  }
  const stage = view.stages[view.current]
  if (stage?.status === 'fork') {
    return {
      mood: 'thinking',
      say: copy.brief.narration.fork(copy.brief.stage[stage.section].label, stage.openDecisions),
    }
  }
  if (stage?.status === 'empty') {
    return {
      mood: 'listening',
      say: copy.brief.narration.empty(copy.brief.stage[stage.section].label),
    }
  }
  if (review > 0) return { mood: 'listening', say: copy.brief.narration.review(review) }
  return { mood: 'happy', say: copy.brief.narration.complete }
}
