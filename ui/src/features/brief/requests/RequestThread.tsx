import './requests.css'
import { useText } from '../../../copy/index.ts'
import { InlineEdit, icons, PixelSprite } from '../../../design/index.ts'
import type { BriefPatch } from '../../../generated/BriefPatch.ts'
import type { Request } from '../../../generated/Request.ts'
import type { RequestTarget } from '../../../generated/RequestTarget.ts'
import { useFirstSeen } from '../stage/useFirstSeen.ts'
import { RequestTrail, requestState } from './RequestTrail.tsx'

type Props = {
  target: RequestTarget
  /** 이 자리에 남긴 요청들. */
  requests: Request[]
  /** 입력 칸을 연 상태. 여닫기는 자리(항목·갈림길)의 버튼이 맡는다. */
  asking: boolean
  onClose: () => void
  onPatch: (p: BriefPatch) => void
}

/** 항목·갈림길 아래 AI에게 남긴 요청들(흔적)과 적기 칸. 대화창이 아니라 지시서에 쌓인다(UX-001). */
export function RequestThread({ target, requests, asking, onClose, onPatch }: Props) {
  const copy = useText().brief.request
  // 새로 남긴 요청·새로 온 답만 반짝여 '어디가 새로 켜졌는지' 알린다(처음 그릴 때 있던 것은 가만히).
  const lineKey = (r: Request) => `${r.id}:${requestState(r)}:${r.acknowledged}`
  const isNew = useFirstSeen(requests.map(lineKey))
  if (!asking && requests.length === 0) return null
  return (
    <div className="rq">
      {requests.length > 0 && (
        <ol className="rq-list">
          {requests.map((r) => (
            // 상태가 바뀌면 키가 바뀌어 다시 그려지며 한 번 더 반짝인다.
            <RequestTrail
              key={lineKey(r)}
              request={r}
              fresh={isNew(lineKey(r))}
              onPatch={onPatch}
            />
          ))}
        </ol>
      )}
      {asking && (
        // 글 대신 모양으로: 말풍선 = AI에게 하는 말, 빈 칸 예시가 무엇을 적는지 보여 준다.
        <div className="rq-ask">
          <span className="rq-ask-icon" aria-hidden>
            <PixelSprite sprite={icons.ask} scale={1} tint="currentColor" />
          </span>
          <InlineEdit
            className="rq-input"
            value=""
            label={copy.inputLabel}
            placeholder={copy.placeholder}
            saveLabel={copy.leave}
            onSave={(text) => onPatch({ op: 'request', target, text })}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  )
}
