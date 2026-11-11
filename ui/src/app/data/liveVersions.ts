import type { BriefSummary } from '../../generated/BriefSummary.ts'
import type { Preferences } from '../../generated/Preferences.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'

/** 다시 읽기 정책: 같은 버전이면 다시 그리지 않고, 화면보다 오래된 응답은 버린다. */
export const listVersion = (l: BriefSummary[]) =>
  l.map((b) => `${b.id}@${b.revision}:${b.title}`).join(',')

export const briefVersion = (v: WorkspaceView) => `${v.brief.id}@${v.brief.revision}:${v.canUndo}`
export const briefIsStale = (next: WorkspaceView, shown: WorkspaceView) =>
  next.brief.id === shown.brief.id && next.brief.revision < shown.brief.revision

export const prefsVersion = (p: Preferences) => String(p.revision)
export const prefsIsStale = (next: Preferences, shown: Preferences) =>
  next.revision < shown.revision
