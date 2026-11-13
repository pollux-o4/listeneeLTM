/** 데이터 양 극단(적음·많음)을 보는 스토리 대역. 판정이 아닌 목록·노트 데이터만 만든다. */
import { summaryOf, workingView } from './features/brief/fixtures.ts'
import type { BriefSummary } from './generated/BriefSummary.ts'
import type { Preference } from './generated/Preference.ts'
import type { Preferences } from './generated/Preferences.ts'

const LONG =
  'with a deliberately long title that has to wrap or truncate gracefully on narrow screens'
const kinds: BriefSummary['learning'][] = [
  { kind: 'unanalyzed' },
  { kind: 'learned', count: 4 },
  { kind: 'stale', count: 2 },
  { kind: 'nothingNew' },
]

export const manyBriefs = (count = 30): BriefSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    ...summaryOf(workingView, kinds[i % kinds.length], i % 5 === 3 ? 'brief-1' : undefined),
    id: `brief-${i + 1}`,
    title: i % 7 === 2 ? `Brief ${i + 1} ${LONG}` : `Brief ${i + 1}`,
    ready: i % 3 === 0,
  }))

const pref = (
  id: string,
  topic: string,
  statement: string,
  extra: Partial<Preference> = {},
): Preference => ({
  id,
  topic,
  statement,
  evidence: Array.from({ length: (Number(id.slice(1)) % 6) + 1 }, (_, i) => `observation ${i + 1}`),
  sources: ['brief-1', 'brief-2'],
  by: 'ai',
  confirmed: Number(id.slice(1)) % 3 === 0,
  retired: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
  ...extra,
})

/** 묶음 5개, 묶음마다 원칙 1개(하위 4개) + 홀로 선 기준 3개, 긴 문장 포함, 내려놓은 것 6개. */
export function manyPreferences(): Preferences {
  const items: Preference[] = []
  let n = 0
  for (const topic of ['decisions', 'navigation', 'motion', 'docs', 'testing']) {
    const principle = `p${++n}`
    items.push(pref(principle, topic, `Principle for ${topic}: ${LONG}`))
    for (let i = 0; i < 4; i++)
      items.push(pref(`p${++n}`, topic, `${topic} rule ${i + 1}`, { parent: principle }))
    for (let i = 0; i < 3; i++)
      items.push(
        pref(
          `p${++n}`,
          topic,
          i === 0 ? `${topic} standalone ${LONG}` : `${topic} standalone ${i}`,
        ),
      )
  }
  for (let i = 0; i < 6; i++) items.push(pref(`p${++n}`, 'docs', `retired ${i}`, { retired: true }))
  return { revision: n, items, changes: [] }
}

export const onePreference = (): Preferences => ({
  revision: 1,
  items: [pref('p1', 'decisions', 'Decide obvious defaults and say so')],
  changes: [],
})
