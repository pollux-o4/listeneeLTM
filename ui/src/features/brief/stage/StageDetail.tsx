import './stage.css'
import { useRef, useState } from 'react'
import { useText } from '../../../copy/index.ts'
import { icons, PixelButton, PixelPanel, PixelSprite, useFlip } from '../../../design/index.ts'
import type { Brief } from '../../../generated/Brief.ts'
import type { BriefPatch } from '../../../generated/BriefPatch.ts'
import type { BriefView } from '../../../generated/BriefView.ts'
import type { StageView } from '../../../generated/StageView.ts'
import { StageIcon, StatusMark } from '../status.tsx'
import { DecisionCard } from './decision/DecisionCard.tsx'
import { ItemRow } from './item/ItemRow.tsx'
import { stageContent } from './stageContent.ts'
import { useFirstSeen } from './useFirstSeen.ts'

type Props = {
  brief: Brief
  stage: StageView
  index: number
  total: number
  /** 전역 '자세히'. 바뀌면 항목별로 따로 펼친 상태는 초기화된다. */
  expandAll?: boolean
  /** 이 단계 항목들의 '자세히 모두 보기/접기'. */
  onToggleAll?: () => void
  /** 마지막 변경을 되돌린다. 행동이 일어나는 목록 곁에 둔다(UX-001). */
  onUndo?: (() => void) | undefined
  onMove: (index: number) => void
  onPatch: (p: BriefPatch) => Promise<boolean>
  /** 조건이 맞지 않아 잠든 갈림길 id(판정 원본은 코어). */
  dormant: BriefView['dormant']
  /** 고르면 다른 갈림길이 잠들거나 깨어나는 선택지들(판정 원본은 코어). */
  impacts: BriefView['impacts']
  decisionItems: BriefView['decisionItems']
}

/** 펼친 한 단계: 갈림길 → 항목 → 직접 적기. 열린 갈림길이 맨 위(지금 할 일 먼저). */
export function StageDetail({
  brief,
  stage,
  index,
  total,
  expandAll = false,
  onToggleAll,
  onUndo,
  onMove,
  onPatch,
  dormant,
  impacts,
  decisionItems,
}: Props) {
  const copy = useText()
  const [text, setText] = useState('')
  const items = brief.sections[stage.section] ?? []
  const content = stageContent({ brief, dormant, impacts, decisionItems }, stage.section)
  const isFresh = useFirstSeen(content.items.map(({ item }) => item.id))
  const list = useRef<HTMLUListElement>(null)
  useFlip(list)

  const add = async () => {
    const next = text.trim()
    // 저장에 실패하면 적은 내용을 지우지 않는다.
    if (next && (await onPatch({ op: 'addItem', section: stage.section, text: next }))) setText('')
  }

  return (
    <PixelPanel enter className="sd">
      <header className="sd-head">
        <span
          className="sd-status"
          data-status={stage.status}
          title={copy.brief.status[stage.status]}
        >
          <span aria-hidden>
            <StageIcon section={stage.section} status={stage.status} scale={2 / 3} />
            <StatusMark status={stage.status} unconfirmed={stage.unconfirmed} />
          </span>
          <span className="sr-only">{copy.brief.status[stage.status]}</span>
        </span>
        <h2 className="sd-title">
          <span className="ltm-title">
            {index + 1}. {copy.brief.stage[stage.section].label}
            {!stage.required && <span className="ltm-label">{copy.brief.stage.optional}</span>}
          </span>
          <span className="ltm-label">{copy.brief.stage[stage.section].hint}</span>
        </h2>
        <div className="sd-nav">
          <PixelButton
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            aria-label={copy.brief.stage.previous}
            title={copy.brief.stage.previousTitle}
          >
            ◀
          </PixelButton>
          <PixelButton
            onClick={() => onMove(index + 1)}
            aria-label={index === total - 1 ? copy.brief.stage.delivery : copy.brief.stage.next}
            title={
              index === total - 1 ? copy.brief.stage.deliveryTitle : copy.brief.stage.nextTitle
            }
          >
            ▶
          </PixelButton>
        </div>
      </header>

      {content.decisions.map((presentation) => (
        <DecisionCard
          key={presentation.decision.id}
          {...presentation}
          onUndo={onUndo}
          onPatch={onPatch}
        />
      ))}

      {(stage.unconfirmed > 0 || content.items.length > 0 || onUndo) && (
        // 단계 전체 조작은 목록 바로 위 한 줄에: 왼쪽은 상태, 오른쪽은 일괄 도구(UX-001 전역·개별 조작).
        <div className="sd-bar">
          <span className="ltm-label sd-bar-status">
            {stage.unconfirmed > 0 && copy.brief.stage.reviewHint(stage.unconfirmed)}
          </span>
          <span className="sd-bar-tools">
            {stage.unconfirmed > 1 && (
              <button
                type="button"
                className="ltm-link sd-confirm-all"
                onClick={() => onPatch({ op: 'confirmSection', section: stage.section })}
              >
                <PixelSprite sprite={icons.heartEmpty} scale={2 / 3} tint="currentColor" />
                {copy.brief.stage.confirmAll}
              </button>
            )}
            {onToggleAll && content.items.length > 0 && (
              <button
                type="button"
                className="ltm-icon"
                aria-pressed={expandAll}
                aria-label={expandAll ? copy.brief.stage.hideDetails : copy.brief.stage.showDetails}
                title={expandAll ? copy.brief.stage.hideDetails : copy.brief.stage.showDetails}
                onClick={onToggleAll}
              >
                <PixelSprite
                  sprite={expandAll ? icons.collapseAll : icons.expandAll}
                  scale={2 / 3}
                  tint="currentColor"
                />
              </button>
            )}
            {onUndo && (
              <button
                type="button"
                className="ltm-icon"
                aria-label={copy.brief.workspace.undo}
                title={copy.brief.workspace.undoTitle}
                onClick={onUndo}
              >
                <PixelSprite sprite={icons.undo} scale={2 / 3} tint="currentColor" />
              </button>
            )}
          </span>
        </div>
      )}

      {content.items.length > 0 && (
        <ul className="sd-items" ref={list}>
          {content.items.map(({ item, requests }, i) => (
            <ItemRow
              key={item.id}
              order={i}
              expandAll={expandAll}
              item={item}
              fresh={isFresh(item.id)}
              requests={requests}
              onPatch={onPatch}
            />
          ))}
        </ul>
      )}
      {items.length === 0 && content.decisions.length === 0 && (
        <p className="sd-empty">
          {stage.required ? copy.brief.stage.emptyHint : copy.brief.stage.optionalEmptyHint}
        </p>
      )}

      <footer className="sd-foot">
        <form
          className="sd-add"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <span className="sd-add-plus" aria-hidden>
            +
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.brief.stage.placeholder}
            aria-label={copy.brief.stage.inputLabel(copy.brief.stage[stage.section].label)}
            enterKeyHint="done"
          />
          {text.trim() && (
            <button type="submit" className="ltm-link">
              {copy.brief.stage.add}
            </button>
          )}
        </form>
      </footer>
    </PixelPanel>
  )
}
