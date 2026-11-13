import type { Locale } from '../generated/Locale.ts'

export type CopyExample = {
  story: string
  args: Partial<Record<Locale, unknown[]>>
  text: Partial<Record<Locale, string>>
}

export type CopyScreens = {
  screens: Record<string, string[]>
  stories: Record<string, { title: string; name: string }>
  examples: Record<string, CopyExample[]>
}
