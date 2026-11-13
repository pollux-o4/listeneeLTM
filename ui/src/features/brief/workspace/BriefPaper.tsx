import { useText } from '../../../copy/index.ts'
import { icons, OriginBadge, PixelSprite, useCopy } from '../../../design/index.ts'
import type { Change } from '../../../generated/Change.ts'
import { useFirstSeen } from '../stage/useFirstSeen.ts'
import './brief-paper.css'

type Props = {
  markdown: string
  ready: boolean
  changes: Change[]
  onHeading: (label: string) => void
  /** 길어진 초안 어디서든 접을 수 있게 붙어 다니는 막대에 둔다. */
  onClose?: () => void
}

/**
 * 조립 중인 최종 지시서(코어가 만든 Markdown 그대로) + 최근 변경.
 * 어느 단계에 있든 보이고 복사할 수 있다(미완성이면 "초안"). 새로 생긴 줄은 잠시 빛난다.
 * 제목을 누르면 그 단계로 이동해 전체 훑어보기 역할을 한다.
 */
export function BriefPaper({ markdown, ready, changes, onHeading, onClose }: Props) {
  const copy = useText()
  const lines = keyed(markdown.trimEnd().split('\n'))
  const isFresh = useFirstSeen(lines.map((l) => l.key))
  const { state, copy: copyText } = useCopy()

  return (
    <aside className="bp" aria-label={copy.brief.paper.label}>
      <div className="bp-bar">
        <p className="ltm-label">
          <span className="bp-stamp" data-ready={ready}>
            {ready ? copy.brief.paper.complete : copy.brief.paper.draft}
          </span>
          {copy.brief.paper.recipientHint}
        </p>
        <span className="bp-tools">
          <button type="button" className="ltm-link" onClick={() => copyText(markdown)}>
            {ready ? copy.brief.paper.copy : copy.brief.paper.copyDraft}
          </button>
          {onClose && (
            <button
              type="button"
              className="ltm-icon"
              aria-label={copy.brief.workspace.hideDraft}
              title={copy.brief.workspace.hideDraft}
              onClick={onClose}
            >
              <PixelSprite sprite={icons.cross} scale={2 / 3} tint="currentColor" />
            </button>
          )}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {state === 'idle' ? '' : copy.brief.copyResult[state]}
      </p>
      {state !== 'idle' && (
        <p className="bp-copied ltm-label" data-state={state} aria-hidden>
          {copy.brief.copyResult[state]}
        </p>
      )}
      <div className="bp-sheet">
        {lines.map(({ line, key }) => {
          const fresh = line !== '' && isFresh(key)
          if (line.startsWith('## ')) {
            return (
              <button
                type="button"
                key={key}
                className="bp-h2"
                data-fresh={fresh}
                title={copy.brief.paper.openStage}
                onClick={() => onHeading(line.slice(3))}
              >
                <span className="bp-mark">## </span>
                {line.slice(3)}
              </button>
            )
          }
          const mark = line.startsWith('# ') ? '# ' : line.startsWith('- ') ? '- ' : ''
          return (
            <div key={key} className={mark === '# ' ? 'bp-h1' : 'bp-line'} data-fresh={fresh}>
              {mark && <span className="bp-mark">{mark}</span>}
              {line.slice(mark.length) || ' '}
            </div>
          )
        })}
      </div>
      {changes.length > 0 && (
        <details className="bp-log" open>
          <summary className="ltm-label">{copy.brief.paper.recentChanges}</summary>
          <ol>
            {changes.slice(0, 5).map((c) => (
              <li key={c.revision}>
                <OriginBadge by={c.by} /> <span>{copy.brief.change(c.event)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </aside>
  )
}

/** 같은 줄이 반복돼도 안정적인 키: 내용 + 등장 순번. */
function keyed(lines: string[]) {
  const count = new Map<string, number>()
  return lines.map((line) => {
    const n = (count.get(line) ?? 0) + 1
    count.set(line, n)
    return { line, key: `${line}#${n}` }
  })
}
