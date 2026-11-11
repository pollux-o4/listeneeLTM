import { useCallback, useEffect, useRef, useState } from 'react'
import type { NoticeContent } from '../design/index.ts'

/** 알림 하나를 잠시 보여준다. 새 알림이 오면 이전 것을 바꾼다. */
export function useNotice(visibleMs = 7000) {
  const [notice, setNotice] = useState<NoticeContent>()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const close = useCallback(() => {
    clearTimeout(timer.current)
    setNotice(undefined)
  }, [])
  const show = useCallback(
    (next: NoticeContent) => {
      clearTimeout(timer.current)
      setNotice(next)
      timer.current = setTimeout(() => setNotice(undefined), visibleMs)
    },
    [visibleMs],
  )
  useEffect(() => () => clearTimeout(timer.current), [])
  return { notice, show, close }
}
