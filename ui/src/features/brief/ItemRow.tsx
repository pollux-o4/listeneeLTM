import { useState } from 'react'
import { useText } from '../../copy/index.ts'
import { InlineEdit, icons, OriginBadge, PixelSprite, useEditToggle } from '../../design/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { Item } from '../../generated/Item.ts'
import { ItemDetail } from './ItemDetail.tsx'

type Props = {
  item: Item
  fresh: boolean
  /** 단계에 '모두 좋아요'가 있으면 항목마다 같은 버튼을 또 두지 않는다. */
  showConfirm: boolean
  expandAll: boolean
  onPatch: (p: BriefPatch) => void
}

/** 항목 한 줄: 작성자 · 내용(고치기: Enter 저장·Esc 취소) · 확인 · 빼기. */
export function ItemRow({ item, fresh, showConfirm, expandAll, onPatch }: Props) {
  const copy = useText()
  const { editing, start, stop, trigger } = useEditToggle()
  const [open, setOpen] = useState(expandAll)
  return (
    <li className="ir" data-confirmed={item.confirmed} data-fresh={fresh}>
      <OriginBadge by={item.by} confirmed={item.confirmed} />
      {editing ? (
        <InlineEdit
          className="ir-input"
          value={item.text}
          label={copy.brief.item.editLabel}
          onSave={(text) => onPatch({ op: 'editItem', id: item.id, text })}
          onClose={stop}
        />
      ) : (
        <span className="ir-text">{item.text}</span>
      )}
      <span className="ir-actions">
        <button
          type="button"
          className="ltm-link"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? copy.brief.item.less : copy.brief.item.more}
        </button>
        {showConfirm && !item.confirmed && (
          <button
            type="button"
            className="ltm-link"
            aria-label={copy.brief.item.confirmLabel(item.text)}
            onClick={() => onPatch({ op: 'confirmItem', id: item.id })}
          >
            {copy.brief.item.confirm}
          </button>
        )}
        <button
          type="button"
          className="ltm-icon"
          ref={trigger}
          aria-label={copy.brief.item.editAction(item.text)}
          title={copy.brief.item.edit}
          onClick={start}
        >
          <PixelSprite sprite={icons.pencil} scale={0.5} tint="currentColor" />
        </button>
        <button
          type="button"
          className="ltm-icon"
          aria-label={copy.brief.item.removeLabel(item.text)}
          title={copy.brief.item.remove}
          onClick={() => onPatch({ op: 'removeItem', id: item.id })}
        >
          ×
        </button>
      </span>
      {open && <ItemDetail detail={item.detail} />}
    </li>
  )
}
