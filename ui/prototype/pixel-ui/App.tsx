/**
 * PROTOTYPE · Pixel UI 작업 화면. 기본은 정본(`?variant=canon`), 비교용 A|B|C, 상태는 메모리 공유(시안을 바꿔도 유지).
 * 질문: 사람이 "AI가 채운 것 / 내가 정할 것 / 바뀐 것 / 최종 결과"를 어느 구조에서 가장 쉽게 파악·조작하는가.
 */
import { useReducer, useState } from 'react'
import './foundations/tokens.css'
import { initialState, reduce } from './model/brief.ts'
import { PrototypeSwitcher, type VariantMeta } from './shell/PrototypeSwitcher.tsx'
import { Canon } from './variants/canon/Canon.tsx'
import { Focus } from './variants/focus/Focus.tsx'
import { QuestMap } from './variants/questmap/QuestMap.tsx'
import { Workbench } from './variants/workbench/Workbench.tsx'

const VARIANTS = { canon: Canon, A: Workbench, B: QuestMap, C: Focus } as const
const META: VariantMeta[] = [
  { key: 'canon', name: '정본 · B+A+C' },
  { key: 'A', name: '작업대' },
  { key: 'B', name: '여정 지도' },
  { key: 'C', name: '한 가지씩' },
]
type Key = keyof typeof VARIANTS

const readParam = (name: string) => new URLSearchParams(window.location.search).get(name)
const writeParam = (name: string, value: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set(name, value)
  window.history.replaceState(null, '', url)
}

export function App({ initialVariant }: { initialVariant?: Key }) {
  const [state, dispatch] = useReducer(reduce, initialState)
  const [variant, setVariant] = useState<Key>(() => {
    const v = initialVariant ?? readParam('variant')
    return v && v in VARIANTS ? (v as Key) : 'canon'
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    readParam('theme') === 'dark' ? 'dark' : 'light',
  )
  const View = VARIANTS[variant]

  return (
    <div data-theme={theme} style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
      <View key={variant} state={state} dispatch={dispatch} />
      <PrototypeSwitcher
        variants={META}
        current={variant}
        onChange={(k) => {
          setVariant(k as Key)
          writeParam('variant', k)
        }}
        theme={theme}
        onTheme={() => {
          const next = theme === 'dark' ? 'light' : 'dark'
          setTheme(next)
          writeParam('theme', next)
        }}
        state={state}
        onReset={() => dispatch({ type: 'reset' })}
      />
    </div>
  )
}
