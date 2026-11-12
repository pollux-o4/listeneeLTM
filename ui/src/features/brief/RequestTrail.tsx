import { useText } from '../../copy/index.ts'
import { icons, OriginBadge, PixelSprite } from '../../design/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { Request } from '../../generated/Request.ts'

/** 요청 한 건의 상태: 적어 둠 → AI가 맡음(처리 중) → 답함(DATA-001). */
export type RequestState = 'noted' | 'working' | 'replied'
export const requestState = (r: Request): RequestState =>
  r.reply !== undefined ? 'replied' : r.taken ? 'working' : 'noted'

type Props = { request: Request; fresh: boolean; onPatch: (p: BriefPatch) => void }

/**
 * 요청 한 건의 흔적(UX-001 AI에게 묻기): 내 말 → (처리 중) → AI 말이 세로 흔적 선과 말마다의 점으로 이어진다.
 * 아직 AI가 안 맡았으면 선 끝이 열린 채 흐리게, 처리 중이면 AI 점이 깜빡이고, 답하면 채워진다.
 * 내 말과 AI 말은 배지·배경·들여쓰기로 갈린다.
 * 확인은 선택: 재촉하지 않고, 누르면 흔적이 흐려지며 한 줄로 접힌다.
 */
export function RequestTrail({ request: r, fresh, onPatch }: Props) {
  const copy = useText().brief.request
  const state = requestState(r)
  const remove = () => onPatch({ op: 'removeRequest', id: r.id })

  if (r.acknowledged && r.reply !== undefined) {
    return (
      <li className="rqt" data-state="acknowledged">
        <span className="rqt-done" aria-hidden>
          <PixelSprite sprite={icons.check} scale={2 / 3} tint="currentColor" />
        </span>
        <span className="rqt-folded">
          <span className="sr-only">{copy.acknowledged}: </span>
          {r.reply}
        </span>
        <button
          type="button"
          className="ltm-icon"
          title={copy.dismiss}
          aria-label={`${copy.dismiss}: ${r.text}`}
          onClick={remove}
        >
          <PixelSprite sprite={icons.cross} scale={2 / 3} tint="currentColor" />
        </button>
      </li>
    )
  }

  return (
    <li className="rqt" data-state={state} data-new={fresh}>
      <div className="rqt-msgs">
        <div className="rqt-msg" data-by="me">
          <OriginBadge by="me" />
          <p className="rqt-text">{r.text}</p>
          <span className="rqt-status ltm-label">{copy.state[state]}</span>
          {state !== 'replied' && (
            <button type="button" className="ltm-link rqt-act" onClick={remove}>
              {copy.cancel}
            </button>
          )}
        </div>
        {state === 'working' && (
          <div className="rqt-msg" data-by="ai" data-pending="true">
            <OriginBadge by="ai" />
            <span className="rt-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {r.reply !== undefined && (
          <div className="rqt-msg" data-by="ai">
            <OriginBadge by="ai" />
            <p className="rqt-text">{r.reply}</p>
            <span className="rqt-acts">
              <button
                type="button"
                className="ltm-icon"
                title={copy.acknowledge}
                aria-label={`${copy.acknowledge}: ${r.text}`}
                onClick={() => onPatch({ op: 'acknowledgeRequest', id: r.id })}
              >
                <PixelSprite sprite={icons.check} scale={2 / 3} tint="currentColor" />
              </button>
              <button
                type="button"
                className="ltm-icon"
                title={copy.dismiss}
                aria-label={`${copy.dismiss}: ${r.text}`}
                onClick={remove}
              >
                <PixelSprite sprite={icons.cross} scale={2 / 3} tint="currentColor" />
              </button>
            </span>
          </div>
        )}
      </div>
    </li>
  )
}
