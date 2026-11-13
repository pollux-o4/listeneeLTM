import { useText } from '../../copy/index.ts'
import { evidenceCount, type NoteEntry, STRENGTH_SLOTS, strength } from './notes.ts'

/** 근거 강도: 칸 수로 확실함을 보여준다(글자 없이도 읽힌다). */
export function Strength({ entry }: { entry: NoteEntry }) {
  const copy = useText()
  const label = copy.preferences.notes.evidenceLabel(evidenceCount(entry))
  return (
    <span className="pn-strength" role="img" title={label} aria-label={label}>
      {STRENGTH_SLOTS.map((slot, i) => (
        <i key={slot} data-on={i < strength(entry)} />
      ))}
    </span>
  )
}
