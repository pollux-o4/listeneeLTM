import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { composeStories, type ReactRenderer } from '@storybook/react-vite'
import { cleanup } from '@testing-library/react'
import { storyNameFromExport } from 'storybook/internal/csf'
import type { ComposedStoryFn } from 'storybook/internal/types'
import { expect, test } from 'vitest'
import { type CopyCall, setCopyRecorder } from '../src/copy/locale.tsx'
import { LOCALES, messages } from '../src/copy/messages.ts'
import { screenExemptions } from '../src/copy/screens.exempt.ts'
import type { CopyExample, CopyScreens } from '../src/copy/screens.types.ts'
import type { Locale } from '../src/generated/Locale.ts'

const modules = import.meta.glob(['../src/**/*.stories.tsx', '!../src/copy/Copy.stories.tsx'], {
  eager: true,
})
const output = resolve('src/copy/screens.generated.json')
const maxExamples = 4

function leaves(node: object, prefix = ''): [string, unknown][] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null ? leaves(value, path) : [[path, value]]
  })
}

const sorted = <T,>(record: Record<string, T>) =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b, 'en')))

test('copy keys link to the stories and actual formatter calls that render them', async () => {
  const screens: CopyScreens['screens'] = {}
  const stories: CopyScreens['stories'] = {}
  const examples: CopyScreens['examples'] = {}
  for (const [file, module] of Object.entries(sorted(modules))) {
    const exports = module as Parameters<typeof composeStories>[0]
    const title = exports.default.title
    if (!title) throw new Error(`Story title is required: ${file}`)
    for (const [exportName, Story] of Object.entries(
      composeStories(exports) as Record<string, ComposedStoryFn<ReactRenderer>>,
    )) {
      // composeStories가 export 이름·명시적 id를 포함한 Storybook 규칙을 적용한다.
      const id = Story.id
      expect(stories[id], `duplicate story id: ${id}`).toBeUndefined()
      const keys = new Set<string>()
      const calls: Partial<Record<Locale, Record<string, CopyCall[]>>> = {}
      for (const locale of LOCALES) {
        const localeCalls: Record<string, CopyCall[]> = {}
        calls[locale] = localeCalls
        localStorage.clear()
        localStorage.setItem('ltm-locale', locale)
        setCopyRecorder((key, call) => {
          keys.add(key)
          if (!call) return
          localeCalls[key] ??= []
          const list = localeCalls[key]
          if (
            !list.some(
              (c) =>
                JSON.stringify([c.args, c.result]) === JSON.stringify([call.args, call.result]),
            )
          )
            list.push(structuredClone(call))
        })
        try {
          // run은 loaders·beforeEach·렌더·play·afterEach를 Storybook과 같이 실행한다.
          await Story.run()
        } catch (error) {
          throw new Error(`${file} · ${id} · ${locale}`, { cause: error })
        } finally {
          cleanup()
          setCopyRecorder(null)
        }
      }
      const annotation = (module as Record<string, { name?: string; storyName?: string }>)[
        exportName
      ]
      stories[id] = {
        title,
        name: annotation?.name ?? annotation?.storyName ?? storyNameFromExport(exportName),
      }
      for (const key of keys) {
        screens[key] ??= []
        screens[key].push(id)
        const count = Math.max(calls.ko?.[key]?.length ?? 0, calls.en?.[key]?.length ?? 0)
        for (let i = 0; i < count; i++) {
          const example: CopyExample = { story: id, args: {}, text: {} }
          for (const locale of LOCALES) {
            const call = calls[locale]?.[key]?.[i]
            if (call) {
              example.args[locale] = call.args
              example.text[locale] = call.result
            }
          }
          examples[key] ??= []
          const list = examples[key]
          if (
            list.length < maxExamples &&
            !list.some(
              (e) =>
                JSON.stringify([e.args, e.text]) === JSON.stringify([example.args, example.text]),
            )
          )
            list.push(example)
        }
      }
    }
  }
  const copyLeaves = leaves(messages.ko)
  const keys = copyLeaves.map(([key]) => key)
  const invalidExemptions = Object.entries(screenExemptions).filter(
    ([key, reason]) => !keys.includes(key) || screens[key]?.length || !reason.trim(),
  )
  expect(invalidExemptions, '불필요하거나 잘못된 screens.exempt.ts 항목').toEqual([])
  const missing = keys.filter((key) => !screens[key]?.length && !screenExemptions[key]).sort()
  expect(missing, `어떤 스토리에서도 접근되지 않은 copy 키:\n${missing.join('\n')}`).toEqual([])
  const missingExamples = copyLeaves
    .filter(
      ([key, value]) =>
        typeof value === 'function' && !examples[key]?.length && !screenExemptions[key],
    )
    .map(([key]) => key)
  expect(missingExamples, '실제 호출 예시가 없는 함수형 문구').toEqual([])
  const result = `${JSON.stringify({ screens: sorted(Object.fromEntries(Object.entries(screens).map(([key, ids]) => [key, ids.sort()]))), stories: sorted(stories), examples: sorted(examples) }, null, 2)}\n`
  if (process.env.COPY_SCREENS_WRITE === '1') await writeFile(output, result)
  else {
    const committed = await readFile(output, 'utf8')
      .then((text) => JSON.parse(text))
      .catch(() => null)
    expect(committed, '문구 화면 연결이 바뀌었습니다. pnpm gen:copy-screens 실행').toEqual(
      JSON.parse(result),
    )
  }
})
