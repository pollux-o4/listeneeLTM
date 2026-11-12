import { useEffect, useState } from 'react'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
const KEY = 'ltm.theme'

const read = (): Theme => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** 기본은 시스템 설정. 사용자가 고르면 이 브라우저에만 기억한다. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      // 저장 불가 환경에서도 현재 세션 테마는 유지된다.
    }
  }, [theme])
  return { theme, setTheme }
}
