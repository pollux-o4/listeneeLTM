import { useId, useState } from 'react'
import { useText } from '../../../copy/index.ts'
import { icons, PixelSprite, usePresence } from '../../../design/index.ts'
import type { BriefPatch } from '../../../generated/BriefPatch.ts'
import type { Item } from '../../../generated/Item.ts'
import { ItemRow } from '../stage/item/ItemRow.tsx'

type Props = {
  label: string
  /** 이 단계의 현재 항목들. */
  items: Item[]
  onOpenStage: () => void
  onPatch: (p: BriefPatch) => void
}

/** 확인할 항목들의 id. 확인한 줄도 이 자리에 남겨(♥ 반응·되돌아보기) 목록이 갑자기 줄지 않게 한다. */
function useReviewIds(items: Item[]): string[] {
  const pending = items.filter((i) => !i.confirmed).map((i) => i.id)
  const [ids, setIds] = useState(pending)
  const added = pending.filter((id) => !ids.includes(id))
  if (added.length > 0) setIds([...ids, ...added])
  return ids
}

/** 전달 단계의 확인 묶음: 단계별 접이식. 펼치면 그 자리에서 확인(♥)·고치기, 단계 화면 이동은 보조. */
export function ReviewGroup({ label, items, onOpenStage, onPatch }: Props) {
  const copy = useText()
  const bodyId = useId()
  const ids = useReviewIds(items)
  const rows = ids.flatMap((id) => items.filter((i) => i.id === id))
  const left = rows.filter((i) => !i.confirmed).length
  const [open, setOpen] = useState(false)
  const body = usePresence(open)

  return (
    <li className="rg" data-open={open} data-done={left === 0}>
      <button
        type="button"
        className="rg-head"
        aria-expanded={open}
        aria-controls={body.mounted ? bodyId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rg-chevron" aria-hidden>
          <PixelSprite sprite={icons.chevron} scale={2 / 3} tint="currentColor" />
        </span>
        <span className="rg-label">{label}</span>
        <span className="rg-count" data-done={left === 0}>
          {left === 0 ? copy.brief.delivery.reviewed : copy.brief.delivery.reviewCount(left)}
        </span>
      </button>
      {body.mounted && (
        <div
          id={bodyId}
          className="rg-body"
          data-closing={body.closing}
          onAnimationEnd={body.onAnimationEnd}
        >
          <ul className="sd-items">
            {rows.map((item, order) => (
              <ItemRow
                key={item.id}
                item={item}
                fresh={false}
                expandAll={false}
                order={order}
                onPatch={onPatch}
              />
            ))}
          </ul>
          <button type="button" className="ltm-link rg-stage" onClick={onOpenStage}>
            {copy.brief.delivery.openStage} ›
          </button>
        </div>
      )}
    </li>
  )
}
