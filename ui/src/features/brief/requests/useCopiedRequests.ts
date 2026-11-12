import { useCallback, useState } from 'react'

const key = (briefId: string) => `ltm.copied-requests.${briefId}`

function read(briefId: string): string[] {
  try {
    const raw = localStorage.getItem(key(briefId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/**
 * 이 브라우저에서 AI에게 할 말을 복사해 간 요청 id. 실제 전달은 사람이 붙여 넣어야 하므로 '보냄'이 아니라 '복사함'만 안다.
 * 이 사람의 편의 표시라 지시서에 저장하지 않는다.
 * 저장소가 막혀도 이번 화면 동안은 기억한다.
 */
export function useCopiedRequests(briefId: string) {
  const [copied, setCopied] = useState(() => read(briefId))
  const [seenBrief, setSeenBrief] = useState(briefId)
  if (seenBrief !== briefId) {
    setSeenBrief(briefId)
    setCopied(read(briefId))
  }
  const markCopied = useCallback(
    (ids: string[]) => {
      setCopied(ids)
      try {
        localStorage.setItem(key(briefId), JSON.stringify(ids))
      } catch {
        // 저장소가 막힌 환경: 화면 상태만으로 동작한다.
      }
    },
    [briefId],
  )
  return { copied, markCopied }
}
