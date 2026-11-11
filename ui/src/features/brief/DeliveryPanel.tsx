import { useText } from '../../copy/index.ts'
import { PixelButton, PixelPanel, useCopy } from '../../design/index.ts'
import type { WorkspaceView } from '../../generated/WorkspaceView.ts'

type Props = { view: WorkspaceView; onOpenStage: (section: string) => void }

/** 전달: 막힘이 없으면 복사, 있으면 막힌 곳으로 바로 가는 목록. 미완성이어도 초안은 언제든 복사할 수 있다. */
export function DeliveryPanel({ view, onOpenStage }: Props) {
  const copy = useText()
  const { state, copy: copyText } = useCopy()
  const blocking = view.issues.filter((i) => i.kind === 'blocking')
  const review = view.issues.filter((i) => i.kind === 'review')

  return (
    <PixelPanel enter tone={view.ready ? 'accent' : 'plain'} className="sd">
      <header className="sd-head">
        <h2 className="sd-title">
          <span className="ltm-title">
            {view.ready ? copy.brief.delivery.ready : copy.brief.delivery.blocked(blocking.length)}
          </span>
          <span className="ltm-label">
            {view.ready
              ? review.length > 0
                ? copy.brief.delivery.reviewHint
                : copy.brief.delivery.readyHint
              : copy.brief.delivery.blockedHint}
          </span>
        </h2>
      </header>
      {view.issues.length > 0 && (
        <ul className="dp-list">
          {[...blocking, ...review].map((i) => (
            <li
              key={`${i.section}:${copy.brief.issue(i.code, copy.brief.stage[i.section].label)}`}
              data-kind={i.kind}
            >
              <button type="button" className="ltm-link" onClick={() => onOpenStage(i.section)}>
                <span aria-hidden>{i.kind === 'blocking' ? '■' : '○'}</span>
                <span className="sr-only">
                  {i.kind === 'blocking'
                    ? copy.brief.delivery.blockingPrefix
                    : copy.brief.delivery.reviewPrefix}
                </span>
                {copy.brief.issue(i.code, copy.brief.stage[i.section].label)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="dp-foot">
        <PixelButton
          variant={view.ready ? 'primary' : 'plain'}
          onClick={() => copyText(view.markdown)}
        >
          {view.ready ? copy.brief.delivery.copy : copy.brief.delivery.copyDraft}
        </PixelButton>
        <span className="ltm-label" aria-live="polite">
          {state === 'idle' ? (
            <>
              {copy.brief.delivery.terminalPrefix}
              <code>{copy.brief.delivery.exportCommand(view.brief.id)}</code>
            </>
          ) : (
            copy.brief.copyResult[state]
          )}
        </span>
      </div>
    </PixelPanel>
  )
}
