import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { LocaleProvider, setCopyRecorder, useLocale, useText } from '../src/copy/locale.tsx'
import { messages } from '../src/copy/messages.ts'

afterEach(() => {
  cleanup()
  setCopyRecorder(null)
  localStorage.clear()
})

test('disabled recorder returns original objects and functions', () => {
  localStorage.setItem('ltm-locale', 'ko')
  const { result } = renderHook(useText, { wrapper: LocaleProvider })
  expect(result.current).toBe(messages.ko)
  expect(result.current.app.notice.saveFailed).toBe(messages.ko.app.notice.saveFailed)
})

test('records deep leaf paths and real calls in both locales, without tracing messages', () => {
  localStorage.setItem('ltm-locale', 'ko')
  const record = vi.fn()
  setCopyRecorder(record)
  const { result } = renderHook(() => ({ copy: useText(), ...useLocale() }), {
    wrapper: LocaleProvider,
  })
  expect(result.current.copy.preferences.notes.emptyHint).toBe(
    messages.ko.preferences.notes.emptyHint,
  )
  expect(record).toHaveBeenLastCalledWith('preferences.notes.emptyHint')
  const format = result.current.copy.app.notice.saveFailed
  expect(format).toBe(result.current.copy.app.notice.saveFailed)
  const message = messages.ko.app.screen.briefError
  expect(format(message)).toBe(`저장하지 못했어요 (${message}).`)
  expect(record).toHaveBeenLastCalledWith('app.notice.saveFailed', {
    locale: 'ko',
    args: [message],
    result: messages.ko.app.notice.saveFailed(message),
  })
  expect(format()).toBe('저장하지 못했어요.')
  expect(format('')).toBe('저장하지 못했어요 ().')
  const count = record.mock.calls.length
  messages.ko.app.notice.saveFailed(message)
  expect(record).toHaveBeenCalledTimes(count)
  act(() => result.current.setLocale('en'))
  result.current.copy.app.notice.saveFailed(message)
  expect(record).toHaveBeenLastCalledWith('app.notice.saveFailed', {
    locale: 'en',
    args: [message],
    result: messages.en.app.notice.saveFailed(message),
  })
  setCopyRecorder(null)
  format(message)
  expect(record).toHaveBeenCalledTimes(count + 2)
})
