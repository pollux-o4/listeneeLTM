import { useText } from '../../copy/index.ts'
import { icons, PixelButton, PixelSprite, useCopy } from '../../design/index.ts'
import type { Brief } from '../../generated/Brief.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { Request } from '../../generated/Request.ts'
import { RequestTrail, requestState } from './RequestTrail.tsx'
import { useCopiedRequests } from './useCopiedRequests.ts'

type Props = { brief: Brief; onPatch: (p: BriefPatch) => void }

/** 자리가 사라진 요청(예: AI가 그 항목을 뺐다)은 답을 볼 곳이 없으니 여기서 보인다. */
function orphaned(brief: Brief): Request[] {
  const items = new Set(Object.values(brief.sections).flatMap((s) => (s ?? []).map((i) => i.id)))
  const decisions = new Set(brief.decisions.map((d) => d.id))
  return brief.requests.filter((r) =>
    r.target.kind === 'item' ? !items.has(r.target.id) : !decisions.has(r.target.id),
  )
}

/**
 * 모아 전하기(UX-001 AI에게 묻기): 적어 두기만 하면 AI에게 닿지 않는다. LTM은 할 말을 복사해 주고,
 * 사람이 AI 창에 붙여 넣는다. 그 두 걸음(① 복사 → ② 붙여 넣기)을 화면 아래에 늘 떠 있게 보인다.
 * 아직 복사하지 않은 요청이 있으면 단추가 천천히 숨 쉬며 부르고, 복사하면 멈춘다(게임의 '할 일 표시'처럼).
 */
export function RequestTray({ brief, onPatch }: Props) {
  const copy = useText().brief.request
  const clip = useCopy()
  const openIds = brief.requests.filter((r) => r.reply === undefined).map((r) => r.id)
  const open = openIds.length
  // 아직 AI가 맡지 않은 것(적어 둠) 중 복사 전인 것만 '할 일'이다. 맡은 것은 AI 차례다.
  const noted = brief.requests.filter((r) => requestState(r) === 'noted').map((r) => r.id)
  const working = brief.requests.filter((r) => requestState(r) === 'working').length
  const { copied, markCopied } = useCopiedRequests(brief.id)
  const uncopied = noted.filter((id) => !copied.includes(id)).length
  const waiting = noted.length - uncopied
  const lost = orphaned(brief)
  if (open === 0 && lost.length === 0) return null
  const send = () => {
    clip.copy(copy.message(brief.title, brief.id, open))
    markCopied(openIds)
  }
  return (
    <section className="rt" aria-label={copy.trayLabel} data-uncopied={uncopied > 0}>
      {open > 0 && (
        <p className="rt-row">
          {/* 개수가 바뀌면 키가 바뀌어 숫자가 한 번 튀어 오른다. */}
          <span key={open} className="rt-count" title={copy.pending(open)}>
            <PixelSprite sprite={icons.ask} scale={1} tint="currentColor" />
            <span className="sr-only">{copy.pending(open)}</span>
            <b aria-hidden>{open}</b>
          </span>
          <PixelButton
            key={`send-${uncopied}`}
            variant={uncopied > 0 ? 'primary' : 'plain'}
            className="rt-send"
            onClick={send}
          >
            {clip.state === 'copied' ? copy.copied : copy.copyAll}
          </PixelButton>
          <span className="rt-step" aria-hidden>
            →
          </span>
          <span className="rt-paste" data-now={clip.state === 'copied'}>
            {copy.pasteStep}
          </span>
          <span className="ltm-label rt-state" aria-live="polite">
            {clip.state === 'copied'
              ? copy.paste
              : uncopied > 0
                ? copy.uncopied(uncopied)
                : waiting > 0
                  ? copy.waiting(waiting)
                  : ''}
          </span>
          {working > 0 && (
            // AI 차례: 도트 세 개가 차례로 깜빡여 '하는 중'을 보인다.
            <span className="rt-working ltm-label">
              <span className="rt-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {copy.working(working)}
            </span>
          )}
          <span className="rt-photo" title={copy.photoHint}>
            <PixelSprite sprite={icons.camera} scale={2 / 3} tint="currentColor" />
            <span className="sr-only">{copy.photoHint}</span>
          </span>
        </p>
      )}
      {lost.length > 0 && (
        <ol className="rq-list">
          {lost.map((r) => (
            <RequestTrail key={r.id} request={r} fresh={false} onPatch={onPatch} />
          ))}
        </ol>
      )}
    </section>
  )
}
