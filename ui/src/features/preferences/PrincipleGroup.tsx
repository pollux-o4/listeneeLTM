import { useId, useState } from 'react'
import { useText } from '../../copy/index.ts'
import { OriginBadge, PixelButton, PixelPanel, usePresence } from '../../design/index.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'
import type { NoteEntry } from './notes.ts'
import { PreferenceCard } from './PreferenceCard.tsx'
import { Strength } from './Strength.tsx'

/**
 * 원칙과 하위 기준(UX-002 위에서 아래로). 접혀 있어도 문장·하위 개수·근거·확인할 개수가 보이고,
 * 처음 펼침은 화면이 정한다(확인할 것이 있는 첫 원칙 하나). 호버 제목은 하위 기준 미리보기일 뿐, 펼치기가 유일한 길이다.
 */
export function PrincipleGroup({
  entry,
  onPatch,
  briefHref,
  defaultOpen,
}: {
  entry: NoteEntry
  /** 처음 펼침 여부(목록 전체를 보고 화면이 정한다). */
  defaultOpen: boolean
  onPatch: (x: PrefPatch) => void
  briefHref: (id: string) => string
}) {
  const copy = useText()
  const { note, children } = entry
  // 원칙 자신의 확인 여부는 배지·버튼이 보여 준다. 개수는 하위 기준만 센다.
  const pending = children.filter((c) => !c.confirmed).length
  const [open, setOpen] = useState(defaultOpen)
  const body = useId()
  const list = usePresence(open)

  return (
    <PixelPanel enter className="pn-principle">
      <div className="pn-principle-head" data-confirmed={note.confirmed}>
        <button
          type="button"
          className="pn-toggle"
          aria-expanded={open}
          aria-controls={body}
          aria-label={copy.preferences.notes.expand(note.statement)}
          title={children.map((c) => `· ${c.statement}`).join('\n')}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="pn-chevron" aria-hidden />
        </button>
        <OriginBadge by={note.by} confirmed={note.confirmed} />
        <p className="pn-statement pn-principle-statement">{note.statement}</p>
        <span className="pn-meta ltm-label">
          {copy.preferences.notes.children(children.length)}
          {pending > 0 && (
            <strong className="pn-meta-pending">
              {copy.preferences.notes.childrenPending(pending)}
            </strong>
          )}
        </span>
        <Strength entry={entry} />
      </div>
      <div className="pn-actions pn-principle-actions">
        {!note.confirmed && (
          <PixelButton
            variant="primary"
            aria-label={copy.preferences.notes.confirmLabel(note.statement)}
            onClick={() => onPatch({ op: 'confirm', id: note.id })}
          >
            {copy.preferences.notes.confirm}
          </PixelButton>
        )}
        <button
          type="button"
          className="ltm-link"
          aria-label={copy.preferences.notes.ungroupLabel(note.statement)}
          onClick={() => onPatch({ op: 'ungroup', id: note.id })}
        >
          {copy.preferences.notes.ungroup}
        </button>
      </div>
      {list.mounted && (
        <ul
          id={body}
          className="pn-children"
          data-closing={list.closing}
          onAnimationEnd={list.onAnimationEnd}
        >
          {children.map((c, i) => (
            <li key={c.id} style={{ '--i': i } as React.CSSProperties}>
              <PreferenceCard pref={c} onPatch={onPatch} nested briefHref={briefHref} />
            </li>
          ))}
        </ul>
      )}
    </PixelPanel>
  )
}
