import type { Locale } from '../generated/Locale.ts'
import { en } from './en/index.ts'
import { ko } from './ko/index.ts'
import type { Messages } from './types.ts'

/** 언어별 문구의 원본. 언어를 더하면 여기 한 줄과 `generated/Locale`(코어)만 바뀐다. */
export const messages: Record<Locale, Messages> = { ko, en }

/** 기준 언어: 문구 형태의 원본이자, 모르는 언어일 때 보여 줄 언어. */
export const BASE_LOCALE: Locale = 'ko'
export const LOCALES = Object.keys(messages) as Locale[]
export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as string[]).includes(value)

/** 브라우저 언어 태그(예: en-US)를 지원 언어로 맞춘다. */
export const matchLocale = (tag: string | undefined): Locale => {
  const primary = tag?.toLowerCase().split('-')[0]
  return isLocale(primary) ? primary : BASE_LOCALE
}
