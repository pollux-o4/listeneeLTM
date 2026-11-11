import type { Preference } from '../../generated/Preference.ts'
import type { Preferences } from '../../generated/Preferences.ts'

/** 근거 강도 칸(최대 5). */
export const STRENGTH_SLOTS = ['s1', 's2', 's3', 's4', 's5'] as const
export const strength = (p: Preference) => Math.min(p.evidence.length, STRENGTH_SLOTS.length)

/** 화면 배치용 묶음: 주제별(근거 많은 순)·내려놓은 것·확인 전 개수. */
export function groupNotes(prefs: Preferences) {
  const active = prefs.items.filter((p) => !p.retired)
  const topics = [...new Set(active.map((p) => p.topic))].sort().map((topic) => ({
    topic,
    notes: active
      .filter((p) => p.topic === topic)
      .sort((a, b) => b.evidence.length - a.evidence.length),
  }))
  return {
    topics,
    retired: prefs.items.filter((p) => p.retired),
    pending: active.filter((p) => !p.confirmed).length,
    empty: active.length === 0,
  }
}
