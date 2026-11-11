import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './client.ts'

/** 읽기 실패: 서버에 닿지 못했는지(offline), 서버가 거절했는지(status)를 구분한다. */
export type LiveError = { offline: boolean; status?: number; message: string }

type Live<T> = {
  data: T | undefined
  error: LiveError | undefined
  /** 쓰기 응답 등 새 값을 즉시 반영 */
  set: (value: T) => void
  /** 지금 다시 읽기 */
  refresh: () => void
}

const toLiveError = (e: unknown): LiveError =>
  e instanceof ApiError
    ? { offline: false, status: e.status, message: e.message }
    : { offline: true, message: e instanceof Error ? e.message : String(e) }

const same = (a: LiveError | undefined, b: LiveError | undefined) =>
  a?.offline === b?.offline && a?.status === b?.status && a?.message === b?.message

/**
 * AI가 파일을 고쳐도 화면이 따라오도록 주기적으로 읽는다.
 * - 버전 키(`versionOf`)가 같으면 상태를 바꾸지 않아 다시 그리지 않는다(쓸수록 느려지지 않게).
 * - `isStale`이 참인 값은 버린다: 쓰기 응답보다 먼저 출발한 읽기가 늦게 도착해도 화면이 옛 상태로 되돌아가지 않는다.
 * - 탭이 숨겨지면 멈추고, 돌아오면 즉시 읽는다.
 */
// shortcut: 폴링으로 AI 편집 감지, 파일 감시+SSE는 지연이 체감되면 도입
export function useLive<T>(
  load: (() => Promise<T>) | undefined,
  versionOf: (v: T) => string,
  intervalMs = 1500,
  isStale?: (next: T, shown: T) => boolean,
): Live<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<LiveError>()
  const shown = useRef<{ version: string; value: T } | undefined>(undefined)
  const fns = useRef({ versionOf, isStale })
  fns.current = { versionOf, isStale }
  const tick = useRef<() => void>(() => undefined)

  const set = useCallback((value: T) => {
    const version = fns.current.versionOf(value)
    if (shown.current?.version === version) return
    if (shown.current && fns.current.isStale?.(value, shown.current.value)) return
    shown.current = { version, value }
    setData(value)
  }, [])

  useEffect(() => {
    shown.current = undefined
    setData(undefined)
    setError(undefined)
    if (!load) return
    let alive = true
    const run = () => {
      if (document.hidden) return
      load().then(
        (value) => {
          if (!alive) return
          setError(undefined)
          set(value)
        },
        (e: unknown) => {
          if (!alive) return
          const next = toLiveError(e)
          setError((prev) => (same(prev, next) ? prev : next))
        },
      )
    }
    tick.current = run
    run()
    const timer = setInterval(run, intervalMs)
    document.addEventListener('visibilitychange', run)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
    }
  }, [load, intervalMs, set])

  const refresh = useCallback(() => tick.current(), [])
  return { data, error, set, refresh }
}
