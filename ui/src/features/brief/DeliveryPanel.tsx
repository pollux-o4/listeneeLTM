import { useRef, useState } from 'react'
import { useText } from '../../copy/index.ts'
import {
  icons,
  PixelButton,
  PixelPanel,
  PixelSprite,
  useCopy,
  useFlip,
} from '../../design/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { SectionKey } from '../../generated/SectionKey.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'
import { DeliveryPreview } from './DeliveryPreview.tsx'
import { ReviewGroup } from './ReviewGroup.tsx'

type Props = {
  view: WorkspaceView
  onOpenStage: (section: string) => void
  onPatch: (p: BriefPatch) => void
  draftOpen: boolean
  onShowDraft: () => void
}

/** 확인 묶음으로 보일 단계들. 다 확인해도 이번 방문 동안은 남겨 '확인함'으로 닫힌다. */
function useReviewSections(view: WorkspaceView): SectionKey[] {
  const now = view.issues.filter((i) => i.kind === 'review').map((i) => i.section)
  const [seen, setSeen] = useState(now)
  const added = now.filter((s) => !seen.includes(s))
  if (added.length > 0) setSeen([...seen, ...added])
  return view.stages.map((s) => s.section).filter((s) => seen.includes(s))
}

/** 전달: 막힘이 있으면 막힌 곳 목록, 없으면 복사. 확인 전 AI 항목은 권고로 이 자리에서 확인한다. 초안은 언제든 복사할 수 있다. */
export function DeliveryPanel({ view, onOpenStage, onPatch, draftOpen, onShowDraft }: Props) {
  const copy = useText()
  const brief = useCopy()
  const command = useCopy()
  const blocking = view.issues.filter((i) => i.kind === 'blocking')
  const reviewSections = useReviewSections(view)
  const pending = view.issues.some((i) => i.kind === 'review')
  // 묶음을 여닫을 때 아래 묶음·미리보기·복사 줄이 뚝 튀지 않고 미끄러진다.
  const groups = useRef<HTMLUListElement>(null)
  useFlip(groups)
  // 지시서·명령 복사 결과를 한 줄로 알린다(실패도 조용히 넘어가지 않게).
  const result = brief.state !== 'idle' ? brief.state : command.state
  const resultText = {
    copied: brief.state === 'copied' ? copy.brief.delivery.copied : copy.brief.copyResult.copied,
    failed: copy.brief.copyResult.failed,
  }
  const exportCommand = copy.brief.delivery.exportCommand(view.brief.id)

  return (
    <PixelPanel enter tone={view.ready ? 'accent' : 'plain'} className="sd">
      <header className="sd-head">
        <h2 className="sd-title">
          <span className="ltm-title">
            {view.ready ? copy.brief.delivery.ready : copy.brief.delivery.blocked(blocking.length)}
          </span>
          <span className="ltm-label">
            {!view.ready
              ? copy.brief.delivery.blockedHint
              : pending
                ? copy.brief.delivery.reviewHint
                : copy.brief.delivery.readyHint}
          </span>
        </h2>
      </header>
      {blocking.length > 0 && (
        <ul className="dp-list">
          {blocking.map((i) => (
            <li key={`${i.section}:${i.code}`}>
              <button type="button" className="ltm-link" onClick={() => onOpenStage(i.section)}>
                <span aria-hidden>■</span>
                <span className="sr-only">{copy.brief.delivery.blockingPrefix}</span>
                {copy.brief.issue(i.code, copy.brief.stage[i.section].label)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {reviewSections.length > 0 && (
        <ul ref={groups} className="rg-list" aria-label={copy.brief.delivery.reviewPrefix}>
          {reviewSections.map((section) => (
            <ReviewGroup
              key={section}
              label={copy.brief.stage[section].label}
              items={(view.brief.sections[section] ?? []).filter((i) => i.by === 'ai')}
              onOpenStage={() => onOpenStage(section)}
              onPatch={onPatch}
            />
          ))}
        </ul>
      )}
      <DeliveryPreview
        markdown={view.markdown}
        brief={view.brief}
        draftOpen={draftOpen}
        onShowDraft={onShowDraft}
      />
      <div className="dp-foot">
        <PixelButton
          variant={view.ready ? 'primary' : 'plain'}
          onClick={() => brief.copy(view.markdown)}
        >
          {view.ready ? copy.brief.delivery.copy : copy.brief.delivery.copyDraft}
        </PixelButton>
        <span className="dp-alt">
          {copy.brief.delivery.terminalPrefix}
          <button
            type="button"
            className="dp-cmd"
            title={copy.brief.delivery.copyCommand}
            onClick={() => command.copy(exportCommand)}
          >
            <code>{exportCommand}</code>
            <span className="dp-cmd-state" data-state={command.state} aria-hidden>
              {command.state === 'copied' ? (
                <PixelSprite sprite={icons.check} scale={2 / 3} tint="currentColor" />
              ) : (
                '⧉'
              )}
            </span>
          </button>
        </span>
        <span className="dp-result ltm-label" aria-live="polite" data-state={result}>
          {result === 'idle' ? '' : resultText[result]}
        </span>
      </div>
    </PixelPanel>
  )
}
