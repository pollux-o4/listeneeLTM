import { useText } from '../../copy/index.ts'
import {
  InlineEdit,
  OriginBadge,
  PixelButton,
  PixelPanel,
  useEditToggle,
} from '../../design/index.ts'
import type { Preference } from '../../generated/Preference.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'
import { Strength } from './Strength.tsx'

/** 기준 하나: 확인·수정·내려놓기와 근거. */
export function PreferenceCard({
  pref: p,
  onPatch,
  nested = false,
  briefHref,
}: {
  pref: Preference
  onPatch: (x: PrefPatch) => void
  /** 원칙 안의 하위 기준: 바깥 패널 없이 들여 쓴다. */
  nested?: boolean
  /** 출처 지시서 주소(화면 경로는 앱 셸이 정한다). */
  briefHref: (id: string) => string
}) {
  const copy = useText()
  const { editing, start, stop, trigger } = useEditToggle()

  return (
    <Frame nested={nested}>
      <div className="pn-card-main" data-confirmed={p.confirmed}>
        <OriginBadge by={p.by} confirmed={p.confirmed} />
        {editing ? (
          <InlineEdit
            className="pn-edit"
            value={p.statement}
            label={copy.preferences.notes.editLabel}
            onSave={(statement) => onPatch({ op: 'edit', id: p.id, statement })}
            onClose={stop}
          />
        ) : (
          <p className="pn-statement">{p.statement}</p>
        )}
        <Strength entry={{ note: p, children: [] }} />
      </div>
      <details className="pn-evidence">
        <summary className="ltm-label">
          {copy.preferences.notes.evidence(p.evidence.length)}
        </summary>
        <ul>
          {p.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        {p.sources.length > 0 && (
          <p className="pn-sources">
            {copy.preferences.notes.sources}
            {p.sources.map((id) => (
              <a key={id} className="ltm-link" href={briefHref(id)}>
                {id}
              </a>
            ))}
          </p>
        )}
      </details>
      <div className="pn-actions">
        {!p.confirmed && (
          <PixelButton
            variant="primary"
            aria-label={copy.preferences.notes.confirmLabel(p.statement)}
            onClick={() => onPatch({ op: 'confirm', id: p.id })}
          >
            {copy.preferences.notes.confirm}
          </PixelButton>
        )}
        <button
          type="button"
          className="ltm-link"
          ref={trigger}
          aria-label={copy.preferences.notes.editAction(p.statement)}
          onClick={start}
        >
          {copy.preferences.notes.edit}
        </button>
        <button
          type="button"
          className="ltm-link"
          aria-label={copy.preferences.notes.retireLabel(p.statement)}
          onClick={() => onPatch({ op: 'retire', id: p.id })}
        >
          {copy.preferences.notes.retire}
        </button>
      </div>
    </Frame>
  )
}

/** 홀로 선 기준은 픽셀 패널, 원칙 안의 하위 기준은 바깥 선 없이 들여 쓴 면(카드 속 카드 방지). */
function Frame({ nested, children }: { nested: boolean; children: React.ReactNode }) {
  if (nested) return <div className="pn-card pn-card-nested">{children}</div>
  return (
    <PixelPanel enter className="pn-card">
      {children}
    </PixelPanel>
  )
}
