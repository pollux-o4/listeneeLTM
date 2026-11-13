import { useState } from 'react'
import { useText } from '../../copy/index.ts'
import { PixelPanel } from '../../design/index.ts'
import type { Preferences } from '../../generated/Preferences.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'
import { NewNote } from './NewNote.tsx'
import { groupNotes, needsConfirm, onlyPending } from './notes.ts'
import { PreferenceCard } from './PreferenceCard.tsx'
import { PrincipleGroup } from './PrincipleGroup.tsx'
import { RetiredNotes } from './RetiredNotes.tsx'
import './preference-notes.css'

type Props = {
  prefs: Preferences
  onPatch: (p: PrefPatch) => Promise<boolean>
  /** 기준이 나온 지시서로 가는 주소 */
  briefHref: (id: string) => string
}

/**
 * 취향 노트: AI가 관찰해 제안한 판단 기준을 사람이 확인·수정·내려놓는 곳.
 * 사용자가 처음부터 채우지 않아도 쌓이고(피로 최소), 근거 수로 확실함을 보여준다.
 */
export function PreferenceNotes({ prefs, onPatch, briefHref }: Props) {
  const copy = useText()
  const all = groupNotes(prefs)
  const { retired, pending, empty } = all
  const [pendingOnly, setPendingOnly] = useState(false)
  const reviewing = pendingOnly && pending > 0
  const topics = reviewing ? onlyPending(all.topics) : all.topics
  // 많아도 길어지지 않게: 확인할 것이 있는 첫 원칙 하나만 펼친다. 확인할 것만 볼 때는 모두 펼친다.
  const firstOpen = topics
    .flatMap((t) => t.entries)
    .find((e) => e.children.length > 0 && needsConfirm(e))?.note.id

  return (
    <div className="pn">
      <header className="pn-head">
        <h1 className="ltm-title">{copy.preferences.notes.title}</h1>
        <p className="pn-lead">{copy.preferences.notes.lead}</p>
        {pending > 0 && (
          <div className="pn-filter">
            <button
              type="button"
              className="ltm-chip"
              aria-pressed={!reviewing}
              onClick={() => setPendingOnly(false)}
            >
              {copy.preferences.notes.showAll}
            </button>
            <button
              type="button"
              className="ltm-chip pn-pending"
              aria-pressed={reviewing}
              onClick={() => setPendingOnly(true)}
            >
              {copy.preferences.notes.pending(pending)}
            </button>
          </div>
        )}
      </header>

      {empty && (
        <PixelPanel>
          <p className="pn-empty">
            <strong>{copy.preferences.notes.emptyTitle}</strong>
            {copy.preferences.notes.emptyHint}
          </p>
        </PixelPanel>
      )}

      {topics.map(({ topic, entries }) => (
        <section key={topic} className="pn-topic" aria-label={topic}>
          <h2 className="ltm-label">{topic}</h2>
          {entries.map((entry) =>
            entry.children.length > 0 ? (
              <PrincipleGroup
                key={`${entry.note.id}-${reviewing}`}
                defaultOpen={reviewing || entry.note.id === firstOpen}
                entry={entry}
                onPatch={onPatch}
                briefHref={briefHref}
              />
            ) : (
              <PreferenceCard
                key={entry.note.id}
                pref={entry.note}
                onPatch={onPatch}
                briefHref={briefHref}
              />
            ),
          )}
        </section>
      ))}

      <NewNote topics={topics.map((t) => t.topic)} onPatch={onPatch} />
      {!reviewing && <RetiredNotes retired={retired} onPatch={onPatch} />}
    </div>
  )
}
