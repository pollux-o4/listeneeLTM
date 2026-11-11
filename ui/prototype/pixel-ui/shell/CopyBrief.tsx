import { useState } from 'react'
import { assemble, type BriefState } from '../model/brief.ts'
import { PixelButton } from '../primitives/index.tsx'

/** 최종 지시서 복사. 준비 전이면 미결 항목을 포함한다고 알린다. */
export function CopyBrief({ state, ready }: { state: BriefState; ready: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <PixelButton
        title={ready ? undefined : '미결 항목이 함께 복사됩니다'}
        onClick={() => {
          void navigator.clipboard?.writeText(assemble(state))
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        }}
      >
        {ready ? '⧉ 지시서 복사' : '⧉ 초안 복사'}
      </PixelButton>
      <span className="cb-toast" aria-live="polite">
        {done ? '복사됨' : ''}
      </span>
    </span>
  )
}
