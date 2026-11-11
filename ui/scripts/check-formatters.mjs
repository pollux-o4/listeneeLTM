import assert from 'node:assert/strict'
import { en } from '../src/copy/en/index.ts'
import { subject } from '../src/copy/ko/grammar.ts'
import { ko } from '../src/copy/ko/index.ts'

// Original core issue messages, including both Korean subject particles.
assert.equal(ko.brief.issue({ kind: 'emptyStage' }, '목적'), '목적이 비어 있다')
assert.equal(ko.brief.issue({ kind: 'emptyStage' }, '포함 범위'), '포함 범위가 비어 있다')
assert.equal(ko.brief.issue({ kind: 'openDecision', question: '질문?' }, ''), '정할 것: 질문?')
assert.equal(ko.brief.issue({ kind: 'unconfirmed', count: 2 }, '목적'), '목적: AI가 쓴 2개 확인 전')
assert.equal(subject('완료 기준'), '완료 기준이')
assert.equal(subject('AI'), 'AI가')
assert.equal(subject(''), '가')
assert.equal(ko.brief.change({ kind: 'setTitle', value: 'changed' }), '제목을 "changed"(으)로')
// 예전 코어가 저장하던 한국어 변경 요약과 같은 문장(ADR-0007 이전 기록과 나란히 보여도 어긋나지 않게).
assert.equal(ko.brief.change({ kind: 'addItem', text: 'A' }), '"A" 추가')
assert.equal(ko.brief.change({ kind: 'editItem', text: 'A' }), '"A"(으)로 수정')
assert.equal(ko.brief.change({ kind: 'confirmSection', count: 2 }), '2개 항목 확인')
assert.equal(ko.brief.change({ kind: 'acceptRecommended', count: 2 }), '남은 갈림길 2개를 추천대로')
assert.equal(ko.brief.change({ kind: 'noteAdded', statement: 'S' }), '"S" 기록')
assert.equal(
  ko.brief.change({ kind: 'undo', undone: { kind: 'removeItem', text: 'A' } }),
  '되돌림: "A" 삭제',
)

const events = [
  { kind: 'setTitle', value: 'Title' },
  ...['addItem', 'editItem', 'removeItem', 'confirmItem'].map((kind) => ({ kind, text: 'Item' })),
  { kind: 'confirmSection', count: 2 },
  ...['ask', 'decideRecommended'].map((kind) => ({ kind, question: 'Question?' })),
  { kind: 'choose', question: 'Question?', label: 'Choice' },
  { kind: 'acceptRecommended', count: 2 },
  { kind: 'undo', undone: null },
  ...[
    'noteAdded',
    'noteReinforced',
    'noteEdited',
    'noteConfirmed',
    'noteRetired',
    'noteRestored',
  ].map((kind) => ({ kind, statement: 'Preference' })),
  { kind: 'legacy', summary: '원문 그대로 / unchanged' },
]
for (const messages of [ko, en]) {
  for (const event of events) assert.equal(typeof messages.brief.change(event), 'string')
  const undone = { kind: 'setTitle', value: 'Title' }
  const once = { kind: 'undo', undone }
  const twice = { kind: 'undo', undone: once }
  assert.ok(messages.brief.change(twice).endsWith(messages.brief.change(once)))
  assert.equal(messages.brief.change(events.at(-1)), '원문 그대로 / unchanged')
}
// 영어 문장 자체는 검수 대상이라 고정하지 않는다. 단복수 규칙만 확인한다.
for (const count of [0, 1, 2]) {
  const plural = count !== 1
  for (const text of [
    en.brief.change({ kind: 'confirmSection', count }),
    en.brief.issue({ kind: 'unconfirmed', count }, 'Purpose'),
  ]) {
    assert.ok(text.includes(String(count)), text)
    assert.equal(/\bitems\b/.test(text), plural, text)
  }
}
function sameShape(left, right) {
  assert.deepEqual(Object.keys(left).sort(), Object.keys(right).sort())
  for (const key of Object.keys(left)) {
    assert.equal(typeof left[key], typeof right[key])
    if (typeof left[key] === 'object') sameShape(left[key], right[key])
  }
}
sameShape(ko, en)
console.log(
  'Locale shape, Korean particles, all change events, recursive undo, legacy text, and English plurals passed.',
)

// Every endpoint returning a workspace must request the selected Markdown language.
const { httpApi: api } = await import('../src/api/client.ts')
const originalFetch = globalThis.fetch
const requests = []
globalThis.fetch = async (url, init) => {
  requests.push({ url, method: init?.method ?? 'GET' })
  return { ok: true, json: async () => ({}) }
}
try {
  for (const locale of ['ko', 'en']) {
    await api.brief('brief/id', locale)
    await api.patchBrief('brief/id', { op: 'setTitle', value: 'Title' }, locale)
    await api.undo('brief/id', locale)
    assert.deepEqual(requests.splice(0), [
      { url: `/api/briefs/brief%2Fid?lang=${locale}`, method: 'GET' },
      { url: `/api/briefs/brief%2Fid?lang=${locale}`, method: 'PATCH' },
      { url: `/api/briefs/brief%2Fid/undo?lang=${locale}`, method: 'POST' },
    ])
  }
} finally {
  globalThis.fetch = originalFetch
}
console.log('Workspace GET/PATCH/undo locale parameters passed.')
