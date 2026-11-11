import { useText } from '../../copy/index.ts'
import type { Preference } from '../../generated/Preference.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'

/** 내려놓은 기준. 다시 적용은 사람만 한다(MEM-001). */
export function RetiredNotes({
  retired,
  onPatch,
}: {
  retired: Preference[]
  onPatch: (p: PrefPatch) => void
}) {
  const copy = useText()
  if (retired.length === 0) return null
  return (
    <details className="pn-retired">
      <summary className="ltm-label">{copy.preferences.notes.retired(retired.length)}</summary>
      {retired.map((p) => (
        <div key={p.id} className="pn-retired-row">
          <span>{p.statement}</span>
          <button
            type="button"
            className="ltm-link"
            aria-label={copy.preferences.notes.restoreLabel(p.statement)}
            onClick={() => onPatch({ op: 'restore', id: p.id })}
          >
            {copy.preferences.notes.restore}
          </button>
        </div>
      ))}
    </details>
  )
}
