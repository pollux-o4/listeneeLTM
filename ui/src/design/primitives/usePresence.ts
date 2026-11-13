import { type AnimationEvent, useEffect, useState } from 'react'

/** 퇴장 애니메이션이 오지 않아도(테스트 환경·스타일 누락) 떼어 내는 상한. --dur-fast보다 넉넉히. */
const EXIT_LIMIT_MS = 400

/**
 * 닫힐 때도 부드럽게: 닫히는 동안 붙여 두고(`closing`) 퇴장 애니메이션이 끝나면 뗀다.
 * 동작 줄이기에서는 애니메이션이 1ms라 곧바로 사라진다.
 */
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  const closing = mounted && !open
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(() => setMounted(false), EXIT_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [closing])
  const onAnimationEnd = (e: AnimationEvent) => {
    if (closing && e.target === e.currentTarget) setMounted(false)
  }
  return { mounted, closing, onAnimationEnd }
}
