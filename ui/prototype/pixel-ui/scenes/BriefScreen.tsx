import { useEffect, useState } from 'react'
import '../foundations/tokens.css'
import {
  PixelButton,
  PixelMeter,
  PixelPanel,
  PixelSprite,
  SpeechBubble,
} from '../primitives/index.tsx'
import { icons } from '../sprites/icons.ts'
import type { ListeneeMood } from '../sprites/listenee.ts'
import { Mascot } from './Mascot.tsx'
import './brief-screen.css'

type Section = { key: string; label: string; required: boolean; items: string[] }

const EMPTY: Section[] = [
  { key: 'purpose', label: '목적', required: true, items: [] },
  { key: 'scopeIn', label: '포함 범위', required: true, items: [] },
  { key: 'scopeOut', label: '제외 범위', required: false, items: [] },
  { key: 'constraints', label: '제약', required: false, items: [] },
  { key: 'acceptance', label: '완료 기준', required: true, items: [] },
]

/** AI가 차례로 채우는 시나리오 (프로토타입 데모용). */
const SCRIPT: [string, string[]][] = [
  ['purpose', ['작품 200점을 빠르게 훑어보는 개인 갤러리']],
  ['scopeIn', ['반응형 격자 레이아웃', '키보드로 작품 넘기기', '확대 보기']],
  ['scopeOut', ['로그인·댓글']],
  ['constraints', ['정적 호스팅만 사용', '이미지당 300KB 이하']],
  ['acceptance', ['Lighthouse 접근성 95 이상', '첫 화면 1초 내 표시']],
]

const BUBBLE: Record<ListeneeMood, string> = {
  idle: '어떤 걸 만들고 싶어요? 한 문장이면 충분해요.',
  listening: '듣고 있어요. 프로젝트 파일도 같이 살펴볼게요.',
  thinking: '빠진 부분을 채우는 중이에요…',
  happy: '필수 항목이 모두 채워졌어요! 바로 전달할 수 있어요.',
}

export function BriefScreen({ initialMood = 'idle' as ListeneeMood, prefilled = false }) {
  const [sections, setSections] = useState(() =>
    prefilled
      ? EMPTY.map((s) => ({ ...s, items: SCRIPT.find(([k]) => k === s.key)?.[1] ?? [] }))
      : EMPTY,
  )
  const [mood, setMood] = useState<ListeneeMood>(prefilled ? 'happy' : initialMood)
  const [step, setStep] = useState(-1)

  const required = sections.filter((s) => s.required)
  const done = required.filter((s) => s.items.length > 0).length

  useEffect(() => {
    if (step < 0) return
    if (step >= SCRIPT.length) return setMood('happy')
    const [key, items] = SCRIPT[step] as [string, string[]]
    const timer = setTimeout(
      () => {
        setSections((prev) => prev.map((s) => (s.key === key ? { ...s, items } : s)))
        setMood('thinking')
        setStep(step + 1)
      },
      step === 0 ? 900 : 700,
    )
    return () => clearTimeout(timer)
  }, [step])

  const start = () => {
    setSections(EMPTY)
    setMood('listening')
    setStep(0)
  }

  return (
    <div className="bs">
      <header className="bs-head">
        <Mascot mood={mood} />
        <SpeechBubble key={mood} text={BUBBLE[mood]} />
        <PixelButton onClick={start}>▶ AI에게 맡기기</PixelButton>
      </header>

      <div className="bs-body">
        <section className="bs-sections" aria-label="과업지시서">
          <h1 className="px-title" style={{ fontSize: 20 }}>
            HTML 갤러리 제작
          </h1>
          {sections.map((s, i) => (
            <PixelPanel key={s.key} enterIndex={i}>
              <div className="bs-section-head">
                <h2 className="px-title">{s.label}</h2>
                {s.required && s.items.length === 0 ? (
                  <span className="px-label" style={{ color: 'var(--c-warn)' }}>
                    필요
                  </span>
                ) : (
                  <PixelSprite sprite={icons.pencil} scale={1} />
                )}
              </div>
              {s.items.length ? (
                <ul className="bs-items">
                  {s.items.map((item, j) => (
                    <li key={item} style={{ animationDelay: `${j * 90}ms` }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bs-empty">아직 비어 있어요</p>
              )}
            </PixelPanel>
          ))}
        </section>

        <aside className="bs-side" aria-label="품질 점검">
          <PixelPanel tone="accent">
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="bs-section-head">
                <h2 className="px-title">품질 점검</h2>
                <span className="px-label">
                  {done}/{required.length}
                </span>
              </div>
              <PixelMeter value={done} max={required.length} label="필수 항목 충족" />
              {required
                .filter((s) => s.items.length === 0)
                .map((s) => (
                  <div className="bs-issue" key={s.key}>
                    <PixelSprite sprite={icons.warn} scale={1} />
                    <span>{s.label}이(가) 비어 있어요</span>
                  </div>
                ))}
              {done === required.length && (
                <div className="bs-issue">
                  <PixelSprite sprite={icons.check} scale={1} />
                  <span>전달 준비 완료</span>
                  <PixelSprite sprite={icons.spark} scale={1} fps={3} />
                </div>
              )}
            </div>
          </PixelPanel>
        </aside>
      </div>
    </div>
  )
}
