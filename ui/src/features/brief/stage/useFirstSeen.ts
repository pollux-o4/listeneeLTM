import { useRef } from 'react'

/**
 * 처음 그릴 때 이미 있던 것과 나중에 생긴 것을 가른다(새로 생긴 것만 강조하기 위해).
 * 판정은 키마다 한 번만 내려 고정하므로, 다시 그려도 강조가 되풀이되지 않는다.
 */
export function useFirstSeen(keys: readonly string[]): (key: string) => boolean {
  const known = useRef<Map<string, boolean> | null>(null)
  const initial = known.current === null
  const map = known.current ?? new Map<string, boolean>()
  known.current = map
  for (const key of keys) if (!map.has(key)) map.set(key, !initial)
  return (key) => map.get(key) ?? false
}
