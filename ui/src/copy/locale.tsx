import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { Locale } from '../generated/Locale.ts'
import { isLocale, matchLocale, messages } from './messages.ts'
import type { Messages } from './types.ts'

const storageKey = 'ltm-locale'
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(storageKey)
    if (isLocale(saved)) return saved
  } catch {
    /* Storage can be unavailable in private or embedded contexts. */
  }
  return matchLocale(typeof navigator === 'undefined' ? undefined : navigator.language)
}
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(
  null,
)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale)
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  const setLocale = (next: Locale) => {
    updateLocale(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      /* Keep the session choice when storage is unavailable. */
    }
  }
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('LocaleProvider is required')
  return context
}
export type CopyCall = { locale: Locale; args: unknown[]; result: string }
export type CopyRecorder = (key: string, call?: CopyCall) => void

let recorder: CopyRecorder | null = null
let recorded: Partial<Record<Locale, Messages>> = {}

/** 개발 도구에서만 켠다. 해제하면 원본 문구 객체를 그대로 반환한다. */
export function setCopyRecorder(next: CopyRecorder | null) {
  recorder = next
  recorded = {}
}

function track<T extends object>(node: T, locale: Locale, path = ''): T {
  const children = new Map<PropertyKey, object>()
  return new Proxy(node, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof prop !== 'string' || !Object.hasOwn(target, prop)) return value
      const key = path ? `${path}.${prop}` : prop
      if (value && typeof value === 'object') {
        if (!children.has(prop)) children.set(prop, track(value, locale, key))
        return children.get(prop)
      }
      if (typeof value === 'string' || typeof value === 'function') recorder?.(key)
      if (typeof value === 'function') {
        if (!children.has(prop))
          children.set(
            prop,
            new Proxy(value, {
              apply(fn, thisArg, args) {
                const result = Reflect.apply(fn, thisArg, args)
                recorder?.(key, { locale, args, result })
                return result
              },
            }),
          )
        return children.get(prop)
      }
      return value
    },
  })
}

export function useText(): Messages {
  const { locale } = useLocale()
  if (!recorder) return messages[locale]
  recorded[locale] ??= track(messages[locale], locale)
  return recorded[locale]
}
