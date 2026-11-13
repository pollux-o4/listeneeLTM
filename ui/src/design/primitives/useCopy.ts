import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyState = 'idle' | 'copied' | 'failed'

/** 클립보드 복사와 그 결과. 실패를 성공처럼 보여주지 않는다. */
export function useCopy(resetMs = 1800): { state: CopyState; copy: (text: string) => void } {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    (text: string) => {
      const done = (ok: boolean) => {
        setState(ok ? 'copied' : 'failed')
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setState('idle'), resetMs)
      }
      if (!navigator.clipboard) return done(false)
      navigator.clipboard.writeText(text).then(
        () => done(true),
        () => done(false),
      )
    },
    [resetMs],
  )
  return { state, copy }
}
