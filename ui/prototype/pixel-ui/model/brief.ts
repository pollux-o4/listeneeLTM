/**
 * PROTOTYPE 상태 모델. 메모리 전용, 저장 없음.
 * 시안이 답할 질문: 사람이 "AI가 채운 것 / 내가 정할 것 / 바뀐 것 / 최종 결과"를 한눈에 구분하고 조작할 수 있는가.
 */
export type Origin = 'ai' | 'me'
export type SectionKey = 'purpose' | 'scopeIn' | 'scopeOut' | 'constraints' | 'acceptance'

export type Item = { id: string; text: string; origin: Origin; confirmed: boolean }
export type Section = {
  key: SectionKey
  label: string
  hint: string
  required: boolean
  items: Item[]
}
export type Option = { id: string; label: string; note: string }
export type Decision = {
  id: string
  section: SectionKey
  question: string
  why: string
  options: Option[]
  recommended: string
  chosen?: string
}
export type Change = { id: number; who: Origin; summary: string }
export type BriefState = {
  title: string
  sections: Section[]
  decisions: Decision[]
  changes: Change[]
  history: Omit<BriefState, 'history'>[]
}

const item = (id: string, text: string, origin: Origin = 'ai', confirmed = false): Item => ({
  id,
  text,
  origin,
  confirmed,
})

export const initialState: BriefState = {
  title: 'HTML 갤러리 제작',
  sections: [
    {
      key: 'purpose',
      label: '목적',
      hint: '무엇을 위해 하는가',
      required: true,
      items: [item('p1', '작품 200점을 빠르게 훑어보는 개인 갤러리')],
    },
    {
      key: 'scopeIn',
      label: '포함 범위',
      hint: '무엇을 하는가',
      required: true,
      items: [item('s1', '반응형 격자 레이아웃'), item('s2', '키보드로 작품 넘기기', 'me', true)],
    },
    {
      key: 'scopeOut',
      label: '제외 범위',
      hint: '하지 않는 것',
      required: false,
      items: [item('o1', '로그인·댓글')],
    },
    { key: 'constraints', label: '제약', hint: '지켜야 할 조건', required: false, items: [] },
    {
      key: 'acceptance',
      label: '완료 기준',
      hint: '완료를 어떻게 확인하는가',
      required: true,
      items: [],
    },
  ],
  decisions: [
    {
      id: 'd1',
      section: 'constraints',
      question: '이미지를 어디에 둘까요?',
      why: '저장 위치가 비용·속도·유지보수를 정합니다. 프로젝트에 서버 코드가 없어 정적 호스팅을 추천해요.',
      options: [
        { id: 'static', label: '정적 호스팅', note: '무료, 빌드 시 최적화' },
        { id: 'cdn', label: '이미지 CDN', note: '빠르지만 월 비용' },
        { id: 'local', label: '내 PC만', note: '공유 불가' },
      ],
      recommended: 'static',
    },
    {
      id: 'd2',
      section: 'acceptance',
      question: '어느 정도면 "다 됐다"고 볼까요?',
      why: '완료 기준이 없으면 수신자가 언제 멈출지 모릅니다. 갤러리는 첫 화면 속도와 접근성이 핵심이에요.',
      options: [
        { id: 'lighthouse', label: '측정 기준', note: '접근성 95 · 첫 화면 1초' },
        { id: 'manual', label: '눈으로 확인', note: '빠르지만 주관적' },
      ],
      recommended: 'lighthouse',
    },
    {
      id: 'd3',
      section: 'scopeIn',
      question: '확대 보기를 넣을까요?',
      why: '작품 감상에 자주 쓰이지만 범위가 늘어납니다.',
      options: [
        { id: 'yes', label: '넣기', note: '+ 하루 정도' },
        { id: 'later', label: '다음 버전', note: '제외 범위로 기록' },
      ],
      recommended: 'yes',
    },
  ],
  changes: [
    { id: 2, who: 'me', summary: '포함 범위에 "키보드로 작품 넘기기" 추가' },
    { id: 1, who: 'ai', summary: '프로젝트 파일을 읽고 초안 작성' },
  ],
  history: [],
}

/** 결정 선택지가 지시서에 남기는 문장. */
const OUTCOME: Record<string, Record<string, [SectionKey, string]>> = {
  d1: {
    static: ['constraints', '이미지는 정적 호스팅, 빌드 시 최적화'],
    cdn: ['constraints', '이미지는 CDN으로 제공'],
    local: ['constraints', '로컬 전용, 배포 없음'],
  },
  d2: {
    lighthouse: ['acceptance', 'Lighthouse 접근성 95 이상 · 첫 화면 1초 내 표시'],
    manual: ['acceptance', '주요 브라우저에서 눈으로 확인'],
  },
  d3: { yes: ['scopeIn', '작품 확대 보기'], later: ['scopeOut', '확대 보기(다음 버전)'] },
}

export type Action =
  | { type: 'choose'; decision: string; option: string }
  | { type: 'confirm'; item: string }
  | { type: 'confirmSection'; section: SectionKey }
  | { type: 'remove'; item: string }
  | { type: 'add'; section: SectionKey; text: string }
  | { type: 'acceptAll' }
  | { type: 'undo' }
  | { type: 'reset' }

let seq = 100
const snapshot = ({ history: _, ...rest }: BriefState) => structuredClone(rest)
const log = (s: BriefState, who: Origin, summary: string): Change[] => [
  { id: ++seq, who, summary },
  ...s.changes,
]

export function reduce(s: BriefState, a: Action): BriefState {
  if (a.type === 'reset') return initialState
  if (a.type === 'undo') {
    const prev = s.history.at(-1)
    return prev ? { ...prev, history: s.history.slice(0, -1) } : s
  }
  const next: BriefState = { ...structuredClone(s), history: [...s.history, snapshot(s)] }
  const findItem = (id: string) =>
    next.sections.flatMap((sec) => sec.items).find((i) => i.id === id)

  switch (a.type) {
    case 'choose': {
      const d = next.decisions.find((x) => x.id === a.decision)
      const out = OUTCOME[a.decision]?.[a.option]
      if (!d || !out) return s
      d.chosen = a.option
      const [key, text] = out
      next.sections
        .find((x) => x.key === key)
        ?.items.push(item(`${d.id}-${a.option}`, text, 'me', true))
      next.changes = log(
        s,
        'me',
        `"${d.question}" → ${d.options.find((o) => o.id === a.option)?.label}`,
      )
      return next
    }
    case 'confirm': {
      const it = findItem(a.item)
      if (!it) return s
      it.confirmed = true
      next.changes = log(s, 'me', `"${it.text}" 확인`)
      return next
    }
    case 'confirmSection': {
      const sec = next.sections.find((x) => x.key === a.section)
      if (!sec) return s
      for (const it of sec.items) it.confirmed = true
      next.changes = log(s, 'me', `${sec.label} 모두 확인`)
      return next
    }
    case 'remove': {
      for (const sec of next.sections) sec.items = sec.items.filter((i) => i.id !== a.item)
      next.changes = log(s, 'me', '항목 삭제')
      return next
    }
    case 'add': {
      next.sections
        .find((x) => x.key === a.section)
        ?.items.push(item(`u${++seq}`, a.text, 'me', true))
      next.changes = log(s, 'me', `"${a.text}" 추가`)
      return next
    }
    case 'acceptAll': {
      for (const d of next.decisions) {
        if (d.chosen) continue
        d.chosen = d.recommended
        const out = OUTCOME[d.id]?.[d.recommended]
        if (out)
          next.sections
            .find((x) => x.key === out[0])
            ?.items.push(item(`${d.id}-r`, out[1], 'ai', false))
      }
      next.changes = log(s, 'ai', '남은 결정을 추천대로 채움')
      return next
    }
  }
}

/** 파생 값: 화면마다 같은 판정을 쓰도록 한 곳에서 계산한다. */
export function summarize(s: BriefState) {
  const required = s.sections.filter((x) => x.required)
  const missing = required.filter((x) => x.items.length === 0)
  const pending = s.decisions.filter((d) => !d.chosen)
  const unconfirmed = s.sections.flatMap((x) => x.items).filter((i) => !i.confirmed)
  const ready = missing.length === 0 && pending.length === 0
  return {
    required,
    missing,
    pending,
    unconfirmed,
    ready,
    filled: required.length - missing.length,
  }
}

/** 수신 AI에게 넘길 최종 지시서. */
export function assemble(s: BriefState): string {
  const lines = [`# ${s.title}`, '']
  for (const sec of s.sections) {
    if (!sec.items.length) continue
    lines.push(`## ${sec.label}`, ...sec.items.map((i) => `- ${i.text}`), '')
  }
  const pending = s.decisions.filter((d) => !d.chosen)
  if (pending.length) lines.push('## 미결', ...pending.map((d) => `- ${d.question}`))
  return lines.join('\n').trim()
}
