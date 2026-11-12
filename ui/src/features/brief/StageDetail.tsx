import { useState } from 'react'
import { useText } from '../../copy/index.ts'
import { PixelButton, PixelPanel } from '../../design/index.ts'
import type { Brief } from '../../generated/Brief.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { StageView } from '../../generated/StageView.ts'
import { DecisionCard } from './DecisionCard.tsx'
import { ItemRow } from './ItemRow.tsx'
import { StatusGlyph } from './status.tsx'
import { useFirstSeen } from './useFirstSeen.ts'
import './stage-detail.css'

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
}

const derivedId = (decisionId: string) => `decision-${decisionId}`

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
}: Props) {
  const copy = useText()
  const [text, setText] = useState('')
  const items = brief.sections[stage.section] ?? []
  const decisions = brief.decisions
    .filter((d) => d.section === stage.section)
    .sort((a, b) => Number(Boolean(a.chosen)) - Number(Boolean(b.chosen)))
  const derived = new Set(brief.decisions.map((d) => derivedId(d.id)))
  const plain = items.filter((i) => !derived.has(i.id))
  const isFresh = useFirstSeen(plain.map((i) => i.id))

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
            <StatusGlyph status={stage.status} />
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

      {decisions.map((d) => (
        <DecisionCard
          key={d.id}
          decision={d}
          derived={items.find((i) => i.id === derivedId(d.id))}
          onPatch={onPatch}
        />
      ))}

      {stage.unconfirmed > 1 && (
        <p className="sd-review">
          <span className="ltm-label">{copy.brief.stage.reviewHint(stage.unconfirmed)}</span>
          <button
            type="button"
            className="ltm-link"
            onClick={() => onPatch({ op: 'confirmSection', section: stage.section })}
          >
            {copy.brief.stage.confirmAll}
          </button>
        </p>
      )}

      {((onToggleAll && plain.length > 0) || onUndo) && (
        <p className="sd-tools">
          {onToggleAll && plain.length > 0 && (
            <button
              type="button"
              className="ltm-link"
              aria-pressed={expandAll}
              onClick={onToggleAll}
            >
              {expandAll ? copy.brief.stage.hideDetails : copy.brief.stage.showDetails}
            </button>
          )}
          {onUndo && (
            <button
              type="button"
              className="ltm-link"
              title={copy.brief.workspace.undoTitle}
              onClick={onUndo}
            >
              {copy.brief.workspace.undo}
            </button>
          )}
        </p>
      )}

      {plain.length > 0 && (
        <ul className="sd-items">
          {plain.map((it) => (
            <ItemRow
              key={`${it.id}-${expandAll}`}
              expandAll={expandAll}
              item={it}
              fresh={isFresh(it.id)}
              showConfirm={stage.unconfirmed <= 1}
              onPatch={onPatch}
            />
          ))}
        </ul>
      )}
      {items.length === 0 && decisions.length === 0 && (
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
