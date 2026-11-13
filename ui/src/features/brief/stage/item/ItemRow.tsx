import './items.css'
import { type CSSProperties, useState } from 'react'

/** 좋아요 파편 방향(도). */
const BURST = [0, 60, 120, 180, 240, 300]

import { useText } from '../../../../copy/index.ts'
import {
  InlineEdit,
  icons,
  OriginBadge,
  PixelSprite,
  useEditToggle,
  usePresence,
} from '../../../../design/index.ts'
import type { BriefPatch } from '../../../../generated/BriefPatch.ts'
import type { Item } from '../../../../generated/Item.ts'
import type { Request } from '../../../../generated/Request.ts'
import { RequestThread } from '../../requests/RequestThread.tsx'
import { ItemDetail } from './ItemDetail.tsx'

type Props = {
  item: Item
  fresh: boolean
  expandAll: boolean
  /** 모두 펼치기에서 위에서부터 차례로 나타나게 하는 순번. */
  order: number
  /** 이 항목에 AI에게 남긴 요청들. */
  requests?: Request[]
  onPatch: (p: BriefPatch) => void
}

/** 항목 한 줄: 작성자 · 내용(고치기: Enter 저장·Esc 취소) · 확인 · AI에게 묻기 · 빼기. */
export function ItemRow({ item, fresh, expandAll, order, requests = [], onPatch }: Props) {
  const copy = useText()
  const ask = useEditToggle()
  const { editing, start, stop, trigger } = useEditToggle()
  const [open, setOpen] = useState(expandAll)
  // 모두 펼치기/접기는 행을 다시 만들지 않고 상태만 따라가 퇴장 모션이 살아 있게 한다.
  const [seenExpandAll, setSeenExpandAll] = useState(expandAll)
  if (seenExpandAll !== expandAll) {
    setSeenExpandAll(expandAll)
    setOpen(expandAll)
  }
  const detail = usePresence(open)
  // 확인 전 → 확인으로 바뀐 순간만 표시해 처음부터 확인된 줄은 가만히 있는다.
  const [wasConfirmed, setWasConfirmed] = useState(item.confirmed)
  const [justConfirmed, setJustConfirmed] = useState(false)
  if (wasConfirmed !== item.confirmed) {
    setWasConfirmed(item.confirmed)
    setJustConfirmed(item.confirmed)
  }
  return (
    <li
      className="ir"
      data-confirmed={item.confirmed}
      data-fresh={fresh}
      data-just-confirmed={justConfirmed}
    >
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
      {/* 개별 조작: 자세히 · 좋아요 · AI에게 묻기 · 고치기 · 빼기. 모든 줄에서 같은 자리·같은 순서. */}
      <span className="ir-actions" hidden={editing}>
        <button
          type="button"
          className="ltm-icon ir-more"
          aria-expanded={open}
          aria-label={`${open ? copy.brief.item.less : copy.brief.item.more}: ${item.text}`}
          title={open ? copy.brief.item.less : copy.brief.item.more}
          onClick={() => setOpen((o) => !o)}
        >
          <PixelSprite sprite={icons.chevron} scale={2 / 3} tint="currentColor" />
        </button>
        {!item.confirmed && (
          <button
            type="button"
            className="ltm-icon ir-confirm"
            aria-label={copy.brief.item.confirmLabel(item.text)}
            title={copy.brief.item.confirm}
            onClick={() => onPatch({ op: 'confirmItem', id: item.id })}
          >
            <PixelSprite sprite={icons.heartEmpty} scale={2 / 3} tint="currentColor" />
            <PixelSprite sprite={icons.heart} scale={2 / 3} tint="currentColor" />
          </button>
        )}
        {justConfirmed && (
          // 누른 자리에서 하트가 차오르며 도트가 튄다. 끝나면 스스로 빠진다.
          <span
            className="ir-burst"
            aria-hidden
            onAnimationEnd={(e) => e.target === e.currentTarget && setJustConfirmed(false)}
          >
            <PixelSprite sprite={icons.heart} scale={2 / 3} tint="currentColor" />
            {BURST.map((angle) => (
              <i key={angle} style={{ '--a': `${angle}deg` } as CSSProperties} />
            ))}
          </span>
        )}
        <button
          type="button"
          className="ltm-icon ir-ask"
          ref={ask.trigger}
          aria-expanded={ask.editing}
          aria-label={copy.brief.request.askLabel(item.text)}
          title={`${copy.brief.request.ask} · ${copy.brief.request.photoHint}`}
          onClick={ask.editing ? ask.stop : ask.start}
        >
          <PixelSprite sprite={icons.ask} scale={2 / 3} tint="currentColor" />
        </button>
        <button
          type="button"
          className="ltm-icon"
          ref={trigger}
          aria-label={copy.brief.item.editAction(item.text)}
          title={copy.brief.item.edit}
          onClick={start}
        >
          <PixelSprite sprite={icons.pencil} scale={2 / 3} tint="currentColor" />
        </button>
        <button
          type="button"
          className="ltm-icon"
          aria-label={copy.brief.item.removeLabel(item.text)}
          title={copy.brief.item.remove}
          onClick={() => onPatch({ op: 'removeItem', id: item.id })}
        >
          <PixelSprite sprite={icons.cross} scale={2 / 3} tint="currentColor" />
        </button>
      </span>
      {detail.mounted && (
        <ItemDetail
          detail={item.detail}
          closing={detail.closing}
          order={order}
          onAnimationEnd={detail.onAnimationEnd}
        />
      )}
      <RequestThread
        target={{ kind: 'item', id: item.id }}
        requests={requests}
        asking={ask.editing}
        onClose={ask.stop}
        onPatch={onPatch}
      />
    </li>
  )
}
