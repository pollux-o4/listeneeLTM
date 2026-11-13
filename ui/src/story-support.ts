import { expect, waitFor } from 'storybook/test'
import type { WorkspaceApi } from './api/client.ts'
import { matchLocale, messages } from './copy/index.ts'
import { summaryOf, workingView } from './features/brief/fixtures.ts'
import prefs from './generated/fixtures/preferences.json'
import type { Preferences } from './generated/Preferences.ts'

/** Storybook과 수집기가 같은 브라우저 경계 대역을 사용한다. */
export function mockClipboard(fails = false) {
  return () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          if (fails) throw new Error('clipboard unavailable')
        },
      },
    })
    return () => {
      if (previous) Object.defineProperty(navigator, 'clipboard', previous)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
  }
}

/** 고정 데이터를 돌려주는 데이터 경계 대역. 필요한 동작만 덮어쓴다. */
export function fakeApi(overrides: Partial<WorkspaceApi> = {}): WorkspaceApi {
  return {
    briefs: async () => [summaryOf(workingView, { kind: 'learned', count: 2 })],
    brief: async () => workingView,
    preferences: async () => prefs as Preferences,
    patchBrief: async () => workingView,
    undo: async () => workingView,
    duplicate: async () => workingView,
    patchPreferences: async () => prefs as Preferences,
    ...overrides,
  }
}

/** 스토리 진행 중에 서버 상태(끊김·오류)를 바꿀 수 있는 대역. 스토리마다 따로 만든다. */
export function switchableApi(base: Partial<WorkspaceApi> = {}) {
  let current = fakeApi(base)
  const api = Object.fromEntries(
    (Object.keys(current) as (keyof WorkspaceApi)[]).map((key) => [
      key,
      (...args: never[]) => (current[key] as (...a: never[]) => unknown)(...args),
    ]),
  ) as WorkspaceApi
  return {
    api,
    reset: () => {
      current = fakeApi(base)
    },
    set: (overrides: Partial<WorkspaceApi>) => {
      current = { ...current, ...overrides }
    },
  }
}

/** 앱 셸 스토리의 주소(경로)를 정하고 끝나면 되돌린다. */
export function atRoute(hash: string) {
  return () => {
    const previous = window.location.hash
    window.location.hash = hash
    return () => {
      window.location.hash = previous
    }
  }
}

export const storyCopy = () => messages[matchLocale(document.documentElement.lang)]

/**
 * 요소가 실제로 보일 때까지 기다린다. 다시 그려지면 요소가 교체되므로 시도마다 새로 찾는다
 * (찾아 둔 요소를 붙잡고 기다리면 떨어져 나간 옛 요소를 검사하게 된다).
 */
export async function appears(
  find: () => HTMLElement | undefined | Promise<HTMLElement | undefined>,
) {
  await waitFor(async () => {
    const el = await find()
    if (!el) throw new Error('Expected element was not rendered')
    expect(el).toBeVisible()
  })
}
