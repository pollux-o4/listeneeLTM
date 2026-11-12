import { type RefObject, useLayoutEffect } from 'react'
import { useReducedMotion } from './useReducedMotion.ts'

/** --dur-base·--ease-soft와 같은 값: 펼치기 모션과 박자를 맞춘다. */
const DURATION_MS = 280
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** 감시할 요소: 목록의 줄들과, 목록이 커지면 함께 밀리는 뒤따르는 형제(예: 입력 줄). */
const tracked = (root: HTMLElement) => {
  const after: HTMLElement[] = []
  for (let el = root.nextElementSibling; el; el = el.nextElementSibling) {
    if (el instanceof HTMLElement) after.push(el)
  }
  return [...root.children].filter((c) => c instanceof HTMLElement).concat(after)
}

/**
 * 목록 높이가 바뀌면(자세히 펼치기·접기) 밀려난 줄들이 뚝 튀지 않고 새 자리로 미끄러진다(FLIP).
 * transform만 쓰고 높이는 애니메이션하지 않는다(UX-001). 동작 줄이기면 아무것도 하지 않는다.
 */
export function useFlip(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || reduced || typeof ResizeObserver === 'undefined') return
    let tops = new Map<HTMLElement, number>()
    const snapshot = () => {
      tops = new Map(tracked(root).map((el) => [el, el.offsetTop]))
    }
    snapshot()
    const observer = new ResizeObserver(() => {
      for (const el of tracked(root)) {
        const before = tops.get(el)
        const delta = before === undefined ? 0 : before - el.offsetTop
        if (Math.abs(delta) < 1) continue
        el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
          duration: DURATION_MS,
          easing: EASING,
        })
      }
      snapshot()
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [ref, reduced])
}
