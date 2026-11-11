import { expect, test } from 'vitest'
import { groupScreen, type Row, rowsFor, suspicious } from '../src/copy/catalog/model.ts'
import { LOCALES } from '../src/copy/messages.ts'

test('flags missing translations and Korean text copied into another locale', () => {
  const missing: Row = { key: 'app.title', dynamic: false, text: { ko: '제목' } }
  const copied: Row = { key: 'app.title', dynamic: false, text: { ko: '제목', en: '제목' } }
  const distinct: Row = { key: 'app.title', dynamic: false, text: { ko: '제목', en: 'Title' } }

  expect(suspicious(missing, 'en')).toBe(true)
  expect(suspicious(copied, 'en')).toBe(true)
  expect(suspicious(distinct, 'en')).toBe(false)
  expect(suspicious(missing, 'ko')).toBe(false)
})

test('selects the most common screen, then sorts ties by story id', () => {
  expect(
    groupScreen(['a', 'b', 'c'], {
      a: ['z-story', 'a-story'],
      b: ['z-story'],
      c: ['a-story'],
    }),
  ).toBe('a-story')
  expect(groupScreen(['missing'], {})).toBeUndefined()
})

test('merges locale keys and text into shared rows', () => {
  const rows = rowsFor('app', undefined, LOCALES)
  const language = rows.find((row) => row.key === 'app.navigation.language')

  expect(language?.text.ko).toBe('언어')
  expect(language?.text.en).toBe('Language')
  expect(rows.some((row) => row.key === 'app.notice.saveFailed' && row.dynamic)).toBe(true)
})
