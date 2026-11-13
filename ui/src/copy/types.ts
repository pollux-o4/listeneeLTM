import type { ko } from './ko/index.ts'

type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : { [K in keyof T]: Widen<T[K]> }

export type Messages = Widen<typeof ko>
