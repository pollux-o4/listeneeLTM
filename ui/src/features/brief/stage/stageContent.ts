import type { BriefView } from '../../../generated/BriefView.ts'
import type { Decision } from '../../../generated/Decision.ts'
import type { SectionKey } from '../../../generated/SectionKey.ts'

/** 잠든 갈림길이 기다리는 질문과 선택지 이름. */
export type Waiting = { question: string; labels: string[] }
/** 선택 전 미리 보기와 선택 후 알림이 공유하는 영향. */
export type Effect = { sleeps: { question: string; dropped?: string }[]; wakes: string[] }

type Content = Pick<BriefView, 'brief' | 'decisionItems' | 'dormant' | 'impacts'>

/** 코어 판정은 그대로 두고 화면에 필요한 항목·요청·질문을 연결한다. */
export function stageContent(
  { brief, decisionItems, dormant, impacts }: Content,
  section: SectionKey,
) {
  const decisionsById = new Map(brief.decisions.map((decision) => [decision.id, decision]))
  const itemsById = new Map(
    Object.values(brief.sections)
      .flatMap((items) => items ?? [])
      .map((item) => [item.id, item]),
  )
  const derivedIds = new Set(Object.values(decisionItems))
  const sleeping = new Set(dormant)
  const rank = (decision: Decision) => (sleeping.has(decision.id) ? 2 : decision.chosen ? 1 : 0)
  const waitingFor = (decision: Decision): Waiting | undefined => {
    if (!sleeping.has(decision.id) || !decision.when) return undefined
    const parent = decisionsById.get(decision.when.decision)
    if (!parent) return undefined
    const options = decision.when.options
    return {
      question: parent.question,
      labels: parent.options
        .filter((option) => options.includes(option.id))
        .map((option) => option.label),
    }
  }
  const effectsOf = (decision: Decision): Record<string, Effect> =>
    Object.fromEntries(
      impacts
        .filter((impact) => impact.decision === decision.id)
        .map((impact) => [
          impact.option,
          {
            sleeps: impact.sleeps.flatMap((id) => {
              const other = decisionsById.get(id)
              if (!other) return []
              const dropped = other.options.find((option) => option.id === other.chosen)?.label
              return [
                dropped ? { question: other.question, dropped } : { question: other.question },
              ]
            }),
            wakes: impact.wakes.flatMap((id) => decisionsById.get(id)?.question ?? []),
          },
        ]),
    )
  return {
    decisions: brief.decisions
      .filter((decision) => decision.section === section)
      .sort((a, b) => rank(a) - rank(b))
      .map((decision) => ({
        decision,
        derived: itemsById.get(decisionItems[decision.id] ?? ''),
        waiting: waitingFor(decision),
        effects: effectsOf(decision),
        requests: brief.requests.filter(
          (request) => request.target.kind === 'decision' && request.target.id === decision.id,
        ),
      })),
    items: (brief.sections[section] ?? [])
      .filter((item) => !derivedIds.has(item.id))
      .map((item) => ({
        item,
        requests: brief.requests.filter(
          (request) => request.target.kind === 'item' && request.target.id === item.id,
        ),
      })),
  }
}
