/** 스프라이트 문자 → 색 토큰. 테마에 따라 색이 바뀌도록 CSS 변수로 칠한다. */
export const SPRITE_COLORS = {
  o: 'var(--c-line)',
  b: 'var(--p-cream)',
  h: 'var(--p-paper)',
  e: 'var(--p-rose)',
  c: 'var(--p-peach)',
  k: 'var(--p-ink)',
  v: 'var(--p-violet)',
  m: 'var(--p-moss)',
  r: 'var(--p-coral)',
  y: 'var(--p-honey)',
  s: 'var(--p-sky)',
} as const

export type SpriteColor = keyof typeof SPRITE_COLORS
