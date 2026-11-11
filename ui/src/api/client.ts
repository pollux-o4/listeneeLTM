import type { BriefPatch } from '../generated/BriefPatch.ts'
import type { BriefSummary } from '../generated/BriefSummary.ts'
import type { Locale } from '../generated/Locale.ts'
import type { Preferences } from '../generated/Preferences.ts'
import type { PrefPatch } from '../generated/PrefPatch.ts'
import type { WorkspaceView } from '../generated/WorkspaceView.ts'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? res.statusText)
  return body as T
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

/** 화면이 의존하는 데이터 경계(포트). 구현은 `httpApi`, 스토리·테스트는 대역을 주입한다. */
export type WorkspaceApi = {
  briefs: () => Promise<BriefSummary[]>
  brief: (id: string, locale: Locale) => Promise<WorkspaceView>
  patchBrief: (id: string, patch: BriefPatch, locale: Locale) => Promise<WorkspaceView>
  undo: (id: string, locale: Locale) => Promise<WorkspaceView>
  preferences: () => Promise<Preferences>
  patchPreferences: (patch: PrefPatch) => Promise<Preferences>
}

/** 로컬 `ltm ui` HTTP 구현. GUI의 쓰기는 사람의 편집으로 기록된다. */
export const httpApi: WorkspaceApi = {
  briefs: () => request<BriefSummary[]>('/briefs'),
  brief: (id: string, locale: Locale) =>
    request<WorkspaceView>(`/briefs/${encodeURIComponent(id)}?lang=${locale}`),
  patchBrief: (id: string, patch: BriefPatch, locale: Locale) =>
    request<WorkspaceView>(
      `/briefs/${encodeURIComponent(id)}?lang=${locale}`,
      json('PATCH', patch),
    ),
  undo: (id: string, locale: Locale) =>
    request<WorkspaceView>(`/briefs/${encodeURIComponent(id)}/undo?lang=${locale}`, json('POST')),
  preferences: () => request<Preferences>('/preferences'),
  patchPreferences: (patch: PrefPatch) =>
    request<Preferences>('/preferences', json('PATCH', patch)),
}
