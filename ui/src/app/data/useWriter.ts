import { useCallback } from 'react'
import { ApiError } from '../../api/client.ts'
import { useText } from '../../copy/index.ts'
import type { NoticeContent } from '../../design/index.ts'

/** 쓰기 결과를 받을 화면 데이터(최신 값으로 교체하거나 다시 읽기). */
export type WriteTarget<T> = { set: (v: T) => void; refresh: () => void }

/**
 * 쓰기 정책 한 곳: 성공하면 반영, 이미 반영된 변경(409)이면 다시 읽기,
 * 그 밖의 실패는 화면을 막지 않고 알리며 다시 시도할 길을 둔다.
 * 성공 여부를 돌려줘, 실패했을 때 호출 측이 입력을 지우지 않게 한다.
 */
export function useWriter(notify: (n: NoticeContent) => void, afterSuccess: () => void) {
  const copy = useText()
  const write = useCallback(
    async <T>(run: () => Promise<T>, target: WriteTarget<T>): Promise<boolean> => {
      try {
        target.set(await run())
        afterSuccess()
        return true
      } catch (e) {
        // 409: 다른 탭·AI가 먼저 같은 변경을 했다. 최신 상태만 다시 읽으면 된다.
        if (e instanceof ApiError && e.status === 409) {
          target.refresh()
          return true
        }
        notify({
          text:
            e instanceof ApiError
              ? copy.app.notice.saveFailed(e.message)
              : copy.app.notice.offlineSave,
          action: { label: copy.app.notice.retry, run: () => void write(run, target) },
        })
        target.refresh()
        return false
      }
    },
    [afterSuccess, notify, copy],
  )
  return write
}
