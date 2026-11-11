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
import { STRENGTH_SLOTS, strength } from './notes.ts'

/** 기준 하나: 확인·수정·내려놓기와 근거. */
export function PreferenceCard({
  pref: p,
  onPatch,
}: {
  pref: Preference
  onPatch: (x: PrefPatch) => void
}) {
  const copy = useText()
  const { editing, start, stop, trigger } = useEditToggle()

  return (
    <PixelPanel enter className="pn-card">
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
        <span
          className="pn-strength"
          role="img"
          title={copy.preferences.notes.evidenceLabel(p.evidence.length)}
          aria-label={copy.preferences.notes.evidenceLabel(p.evidence.length)}
        >
          {STRENGTH_SLOTS.map((slot, i) => (
            <i key={slot} data-on={i < strength(p)} />
          ))}
        </span>
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
    </PixelPanel>
  )
}
