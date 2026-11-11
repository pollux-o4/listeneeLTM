import type { Messages } from '../types.ts'
import { appCopy as app } from './app.ts'
import { briefCopy as brief } from './brief.ts'
import { commonCopy as common } from './common.ts'
import { preferencesCopy as preferences } from './preferences.ts'

export const en = { common, app, brief, preferences } satisfies Messages
