import { useText } from '../../copy/index.ts'
import { PixelPanel } from '../../design/index.ts'
import type { Preferences } from '../../generated/Preferences.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'
import { NewNote } from './NewNote.tsx'
import { groupNotes } from './notes.ts'
import { PreferenceCard } from './PreferenceCard.tsx'
import { RetiredNotes } from './RetiredNotes.tsx'
import './preference-notes.css'

type Props = { prefs: Preferences; onPatch: (p: PrefPatch) => Promise<boolean> }

/**
 * 취향 노트: AI가 관찰해 제안한 판단 기준을 사람이 확인·수정·내려놓는 곳.
 * 사용자가 처음부터 채우지 않아도 쌓이고(피로 최소), 근거 수로 확실함을 보여준다.
 */
export function PreferenceNotes({ prefs, onPatch }: Props) {
  const copy = useText()
  const { topics, retired, pending, empty } = groupNotes(prefs)

  return (
    <div className="pn">
      <header className="pn-head">
        <h1 className="ltm-title">{copy.preferences.notes.title}</h1>
        <p className="pn-lead">
          {copy.preferences.notes.lead}
          {pending > 0 && <strong>{copy.preferences.notes.pending(pending)}</strong>}
        </p>
      </header>

      {empty && (
        <PixelPanel>
          <p className="pn-empty">{copy.preferences.notes.emptyHint}</p>
        </PixelPanel>
      )}

      {topics.map(({ topic, notes }) => (
        <section key={topic} className="pn-topic" aria-label={topic}>
          <h2 className="ltm-label">{topic}</h2>
          {notes.map((p) => (
            <PreferenceCard key={p.id} pref={p} onPatch={onPatch} />
          ))}
        </section>
      ))}

      <NewNote topics={topics.map((t) => t.topic)} onPatch={onPatch} />
      <RetiredNotes retired={retired} onPatch={onPatch} />
    </div>
  )
}
