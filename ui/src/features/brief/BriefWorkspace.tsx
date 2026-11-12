import { useEffect, useId, useState } from 'react'
import { useText } from '../../copy/index.ts'
import {
  InlineEdit,
  icons,
  PixelButton,
  PixelSprite,
  useEditToggle,
  usePresence,
} from '../../design/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'
import { BriefPaper } from './BriefPaper.tsx'
import { DeliveryPanel } from './DeliveryPanel.tsx'
import { narrate } from './narration.ts'
import { QuestPath } from './QuestPath.tsx'
import { StageDetail } from './StageDetail.tsx'
import './workspace.css'

type Props = {
  view: WorkspaceView
  /** 저장에 성공하면 true. 실패 알림은 호출 측이 맡는다. */
  onPatch: (p: BriefPatch) => Promise<boolean>
  onUndo: () => void
}

const typing = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  (el as HTMLElement | null)?.isContentEditable

/** 지시서 작업 화면: 길(어디·다음) → 펼친 단계(지금 할 일) | 최종 지시서(결과). 표현만 담당한다. */
export function BriefWorkspace({ view, onPatch, onUndo }: Props) {
  const copy = useText()
  const n = view.stages.length
  const [open, setOpen] = useState(() => Math.min(view.current, n))
  const title = useEditToggle()
  // 초안은 기본 숨김: 관심 있을 때만 펼친다(점진 공개, UX-001). 영속하지 않는다.
  const [draftOpen, setDraftOpen] = useState(false)
  /** 전역 '자세히': 모든 항목의 자세히를 한꺼번에 펼치거나 접는다. */
  const [detailsOpen, setDetailsOpen] = useState(false)
  const draft = usePresence(draftOpen)
  const draftId = useId()

  // 좁은 화면에서는 초안이 단계 카드 아래에 쌓여 화면 밖에서 열린다. 열면 그 자리로 데려간다.
  useEffect(() => {
    if (!draftOpen || !window.matchMedia?.('(max-width: 960px)').matches) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame = requestAnimationFrame(() =>
      document
        .getElementById(draftId)
        ?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [draftOpen, draftId])
  const { mood, say } = narrate(view, copy)
  const openDecisions = view.stages.reduce((sum, s) => sum + s.openDecisions, 0)
  const move = (i: number) => setOpen(Math.max(0, Math.min(n, i)))
  const openWhere = (match: (s: WorkspaceView['stages'][number]) => boolean) => {
    const i = view.stages.findIndex(match)
    if (i >= 0) setOpen(i)
  }

  // 다른 지시서로 바꾸면 그 지시서의 막힌 곳부터 연다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 지시서 id가 바뀔 때만
  useEffect(() => setOpen(Math.min(view.current, n)), [view.brief.id])

  // 숙련자용 단축키: ←/→ 단계 이동, Ctrl·⌘+Z 되돌리기. 글을 쓰는 중에는 끼어들지 않는다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(document.activeElement) || e.altKey || e.shiftKey) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!view.canUndo) return
        e.preventDefault()
        onUndo()
      } else if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowLeft') setOpen((i) => Math.max(0, i - 1))
        if (e.key === 'ArrowRight') setOpen((i) => Math.min(n, i + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n, onUndo, view.canUndo])

  const stage = view.stages[open]
  return (
    <div className="ws">
      <header className="ws-head">
        <div className="ws-title-row">
          {title.editing ? (
            <InlineEdit
              className="ws-title-input"
              value={view.brief.title}
              label={copy.brief.workspace.editTitleLabel}
              onSave={(value) => void onPatch({ op: 'setTitle', value })}
              onClose={title.stop}
            />
          ) : (
            <h1 className="ws-title">{view.brief.title}</h1>
          )}
          <button
            type="button"
            className="ltm-icon"
            ref={title.trigger}
            aria-label={copy.brief.workspace.editTitle}
            title={copy.brief.workspace.editTitle}
            onClick={title.start}
          >
            <PixelSprite sprite={icons.pencil} scale={0.5} tint="currentColor" />
          </button>
        </div>
        <div className="ws-actions">
          {openDecisions > 0 && (
            <button
              type="button"
              className="ltm-link"
              onClick={() => onPatch({ op: 'acceptRecommended' })}
            >
              {copy.brief.workspace.acceptRecommended(openDecisions)}
            </button>
          )}
          <button
            type="button"
            className="ltm-link"
            aria-expanded={draftOpen}
            aria-controls={draftId}
            onClick={() => setDraftOpen((v) => !v)}
          >
            {draftOpen ? copy.brief.workspace.hideDraft : copy.brief.workspace.showDraft}
          </button>
          <PixelButton
            onClick={onUndo}
            disabled={!view.canUndo}
            title={copy.brief.workspace.undoTitle}
          >
            {copy.brief.workspace.undo}
          </PixelButton>
        </div>
      </header>

      <QuestPath
        stages={view.stages}
        current={view.current}
        ready={view.ready}
        open={open}
        mood={mood}
        say={say}
        onOpen={move}
      />

      <div className="ws-body" data-draft={draft.mounted}>
        {stage ? (
          <StageDetail
            key={stage.section}
            brief={view.brief}
            stage={stage}
            index={open}
            total={n}
            expandAll={detailsOpen}
            onToggleAll={() => setDetailsOpen((v) => !v)}
            onUndo={view.canUndo ? onUndo : undefined}
            onMove={move}
            onPatch={onPatch}
          />
        ) : (
          <DeliveryPanel
            view={view}
            onOpenStage={(section) => openWhere((s) => s.section === section)}
          />
        )}
        {draft.mounted && (
          <div
            id={draftId}
            className="ws-draft"
            data-closing={draft.closing}
            onAnimationEnd={draft.onAnimationEnd}
          >
            <BriefPaper
              key={view.brief.id}
              markdown={view.markdown}
              ready={view.ready}
              changes={view.brief.changes}
              onHeading={(label) => openWhere((s) => copy.brief.stage[s.section].label === label)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
