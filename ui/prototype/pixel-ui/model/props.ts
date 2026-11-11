import type { Action, BriefState } from './brief.ts'

export type VariantProps = { state: BriefState; dispatch: (a: Action) => void }
