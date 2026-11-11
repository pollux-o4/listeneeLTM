/** 스토리 데이터: 코어 판정 결과 그대로(`cargo test`가 생성). 손으로 만든 판정 금지. */

import type { BriefSummary } from '../../generated/BriefSummary.ts'
import type { BriefView } from '../../generated/BriefView.ts'
import done from '../../generated/fixtures/done.json'
import empty from '../../generated/fixtures/empty.json'
import review from '../../generated/fixtures/review.json'
import started from '../../generated/fixtures/started.json'
import working from '../../generated/fixtures/working.json'
import type { Locale } from '../../generated/Locale.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'

// Core-rendered snapshots keep Markdown assembly out of the UI.
const ws = (
  snapshot: { view: unknown; markdown: Record<Locale, string> },
  canUndo = true,
): WorkspaceView => ({
  ...(snapshot.view as BriefView),
  markdown: snapshot.markdown.ko,
  canUndo,
})

export const emptyView = ws(empty, false)
export const startedView = ws(started)
export const workingView = ws(working)
export const reviewView = ws(review)
export const doneView = ws(done)

/** 목록 요약 대역. 학습 상태는 스토리마다 정한다. */
export const summaryOf = (
  view: WorkspaceView,
  learning: BriefSummary['learning'] = { kind: 'unanalyzed' },
  derivedFrom?: string,
): BriefSummary => ({
  id: view.brief.id,
  title: view.brief.title,
  revision: view.brief.revision,
  updatedAt: view.brief.updatedAt,
  ready: view.ready,
  learning,
  ...(derivedFrom ? { derivedFrom } : {}),
})

export function localizedFixture(view: WorkspaceView, locale: Locale): WorkspaceView {
  if (view === emptyView) return { ...view, markdown: empty.markdown[locale] }
  if (view === startedView) return { ...view, markdown: started.markdown[locale] }
  if (view === reviewView) return { ...view, markdown: review.markdown[locale] }
  if (view === doneView) return { ...view, markdown: done.markdown[locale] }
  return { ...view, markdown: working.markdown[locale] }
}
