import { useCallback, useRef } from 'react'
import { useApi } from '../../api/ApiProvider.tsx'
import { useLive } from '../../api/useLive.ts'
import { type Messages, useLocale, useText } from '../../copy/index.ts'
import type { NoticeContent } from '../../design/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { BriefSummary } from '../../generated/BriefSummary.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'
import { href, type Route } from '../route.ts'
import {
  briefIsStale,
  briefVersion,
  listVersion,
  prefsIsStale,
  prefsVersion,
} from './liveVersions.ts'
import { useWriter } from './useWriter.ts'

/** 화면이 쓰는 데이터와 쓰기 동작을 묶는다. 다시 읽기 정책은 `liveVersions`, 쓰기 정책은 `useWriter`. */
/** 되돌릴 수 있게 알리는 패치와 그 문구: 한곳에서 정한다. */
function undoableNotice(p: BriefPatch, text: Messages['app']['notice']) {
  if (p.op === 'removeItem') return text.removed
  if (p.op === 'confirmItem') return text.confirmed
  if (p.op === 'confirmSection') return text.confirmedAll
  return undefined
}

export function useWorkspaceData(route: Route, notify: (n: NoticeContent) => void) {
  const api = useApi()
  const copy = useText()
  const { locale } = useLocale()
  const list = useLive(api.briefs, listVersion, 3000)
  const prefs = useLive(api.preferences, prefsVersion, 3000, prefsIsStale)
  const write = useWriter(notify, list.refresh)

  const briefId = route.kind === 'brief' ? (route.id ?? list.data?.[0]?.id) : undefined
  const loadBrief = useCallback(() => api.brief(briefId as string, locale), [api, briefId, locale])
  const brief = useLive(briefId ? loadBrief : undefined, briefVersion, 1500, briefIsStale)

  // 언어나 지시서를 바꾸기 전에 시작한 쓰기의 응답이 지금 화면을 덮지 않게 한다.
  const { set: updateBrief, refresh: refreshBrief } = brief
  const current = useRef({ locale, briefId })
  current.current = { locale, briefId }
  const briefTarget = {
    set: (value: WorkspaceView) => {
      if (current.current.locale === locale && current.current.briefId === value.brief.id)
        updateBrief(value)
      else refreshBrief()
    },
    refresh: refreshBrief,
  }
  const prefsTarget = { set: prefs.set, refresh: prefs.refresh }

  const undoBrief = () =>
    briefId ? write(() => api.undo(briefId, locale), briefTarget) : Promise.resolve(false)

  const patchBrief = async (p: BriefPatch) => {
    if (!briefId) return false
    const ok = await write(() => api.patchBrief(briefId, p, locale), briefTarget)
    // 확인을 묻지 않는 행동(빼기·좋아요)은 결과를 알리고 바로 되돌릴 길을 눈앞에 둔다.
    const done = ok ? undoableNotice(p, copy.app.notice) : undefined
    if (done)
      notify({ text: done, action: { label: copy.app.notice.undo, run: () => void undoBrief() } })
    return ok
  }

  const patchPrefs = (p: PrefPatch) => write(() => api.patchPreferences(p), prefsTarget)

  /** 복제해 새로 시작(FLOW-002): 저장소가 선택한 id로 이동한다. */
  const duplicateBrief = async (from: BriefSummary) => {
    const title = copy.app.drawer.copyTitle(from.title)
    const ok = await write(() => api.duplicate(from.id, title, locale), {
      set: (view) => {
        window.location.hash = href({ kind: 'brief', id: view.brief.id })
        notify({ text: copy.app.notice.duplicated(title) })
      },
      refresh: list.refresh,
    })
    return ok
  }

  return { list, prefs, brief, briefId, patchBrief, undoBrief, patchPrefs, duplicateBrief }
}
