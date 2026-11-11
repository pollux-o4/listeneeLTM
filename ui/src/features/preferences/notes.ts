import type { Preference } from '../../generated/Preference.ts'
import type { Preferences } from '../../generated/Preferences.ts'

/** 근거 강도 칸(최대 5). */
export const STRENGTH_SLOTS = ['s1', 's2', 's3', 's4', 's5'] as const

/** 최상위 항목: 홀로 선 기준, 또는 하위 기준을 가진 원칙(2단, ADR-0008). */
export type NoteEntry = { note: Preference; children: Preference[] }

/** 원칙의 근거는 하위 기준 근거의 합이다(MEM-001). */
export const evidenceCount = ({ note, children }: NoteEntry) =>
  note.evidence.length + children.reduce((sum, c) => sum + c.evidence.length, 0)
export const strength = (entry: NoteEntry) => Math.min(evidenceCount(entry), STRENGTH_SLOTS.length)

/** 화면 배치용 묶음: 주제 → 원칙·기준(근거 많은 순) · 내려놓은 것 · 확인 전 개수. */
export function groupNotes(prefs: Preferences) {
  const active = prefs.items.filter((p) => !p.retired)
  const childrenOf = (id: string) =>
    active.filter((c) => c.parent === id).sort((a, b) => b.evidence.length - a.evidence.length)
  const entries: NoteEntry[] = active
    .filter((p) => p.parent === undefined)
    .map((note) => ({ note, children: childrenOf(note.id) }))
  const topics = [...new Set(entries.map((e) => e.note.topic))].sort().map((topic) => ({
    topic,
    entries: entries
      .filter((e) => e.note.topic === topic)
      .sort((a, b) => evidenceCount(b) - evidenceCount(a)),
  }))
  return {
    topics,
    retired: prefs.items.filter((p) => p.retired),
    pending: active.filter((p) => !p.confirmed).length,
    empty: active.length === 0,
  }
}
