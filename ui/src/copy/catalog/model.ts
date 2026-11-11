import type { Locale } from '../../generated/Locale.ts'
import { BASE_LOCALE, LOCALES, messages } from '../messages.ts'
import generated from '../screens.generated.json'
import type { CopyExample, CopyScreens } from '../screens.types.ts'

export const AREAS: Record<string, { title: string; note: string }> = {
  app: { title: '앱 셸', note: '상단 바·연결 상태·빈 화면·알림' },
  brief: { title: '지시서', note: '여정 지도·단계·막힘·변경 기록·전달' },
  preferences: { title: '취향 노트', note: '판단 기준 목록과 편집' },
  common: { title: '공통 요소', note: '디자인 시스템 프리미티브·마스코트' },
}

export const { screens, stories, examples } = generated as CopyScreens

export type Row = { key: string; dynamic: boolean; text: Partial<Record<Locale, string>> }
export type Area = { key: string; title: string; note: string; rows: Row[] }

export function flatten(
  node: unknown,
  path: string[],
  locale: Locale,
  out: Map<string, { dynamic: boolean; text: string }>,
  allExamples: Record<string, CopyExample[]> = examples,
) {
  const key = path.join('.')
  if (typeof node === 'string') out.set(key, { dynamic: false, text: node })
  else if (typeof node === 'function')
    out.set(key, {
      dynamic: true,
      text: (allExamples[key] ?? []).map((example) => example.text[locale] ?? '').join('\n'),
    })
  else if (node && typeof node === 'object')
    for (const [part, value] of Object.entries(node))
      flatten(value, [...path, part], locale, out, allExamples)
}

export function rowsFor(
  area: string,
  allMessages: typeof messages = messages,
  locales: Locale[] = LOCALES,
  allExamples: Record<string, CopyExample[]> = examples,
): Row[] {
  const perLocale = locales.map((locale) => {
    const values = new Map<string, { dynamic: boolean; text: string }>()
    flatten(
      (allMessages[locale] as Record<string, unknown>)[area],
      [area],
      locale,
      values,
      allExamples,
    )
    return [locale, values] as const
  })
  const keys = [...new Set(perLocale.flatMap(([, values]) => [...values.keys()]))]
  return keys.map((key) => ({
    key,
    dynamic: perLocale.some(([, values]) => values.get(key)?.dynamic),
    text: Object.fromEntries(perLocale.map(([locale, values]) => [locale, values.get(key)?.text])),
  }))
}

export const suspicious = (row: Row, locale: Locale) =>
  locale !== BASE_LOCALE &&
  (row.text[locale] === undefined ||
    (row.text[locale] === row.text[BASE_LOCALE] && /[가-힣]/.test(row.text[locale] ?? '')))

export function groupScreen(
  keys: string[],
  allScreens: Record<string, string[]> = screens,
): string | undefined {
  const counts = new Map<string, number>()
  for (const key of keys)
    for (const id of allScreens[key] ?? []) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts].sort(
    ([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, 'en'),
  )[0]?.[0]
}

export const storyName = (id: string) => {
  const story = stories[id]
  return story ? `${story.title} · ${story.name}` : id
}

/** Storybook 관리 화면(바깥 창)에서 해당 스토리를 연다. */
export const storyHref = (id: string) => `/?path=/story/${id}`

export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const item of items) {
    const group = key(item)
    out.set(group, [...(out.get(group) ?? []), item])
  }
  return out
}

export function catalogAreas(): Area[] {
  const keys = Object.keys(messages[BASE_LOCALE])
  const ordered = [
    ...Object.keys(AREAS).filter((key) => keys.includes(key)),
    ...keys.filter((key) => !(key in AREAS)),
  ]
  return ordered.map((key) => ({
    key,
    ...(AREAS[key] ?? { title: key, note: '' }),
    rows: rowsFor(key),
  }))
}

export const localeNames = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    `${messages[BASE_LOCALE].app.navigation.languages[locale]}${locale === BASE_LOCALE ? ' (기준)' : ''}`,
  ]),
) as Record<Locale, string>
