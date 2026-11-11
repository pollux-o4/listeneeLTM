import { useEffect, useRef, useState } from 'react'
import { useText } from '../copy/index.ts'
import { icons, PixelSprite } from '../design/index.ts'
import type { BriefSummary } from '../generated/BriefSummary.ts'
import type { LearningStatus } from '../generated/LearningStatus.ts'
import { href } from './route.ts'
import './drawer.css'

export const DRAWER_ID = 'brief-drawer'

/** AI가 다시 읽어야 하는 지시서(미분석·분석 후 바뀜). 배지와 거르기가 같은 규칙을 쓴다. */
export const needsAnalysis = (b: BriefSummary) =>
  b.learning.kind === 'unanalyzed' || b.learning.kind === 'stale'

type Props = {
  briefs: BriefSummary[]
  briefId: string | undefined
  onClose: () => void
  onDuplicate: (brief: BriefSummary) => void
}

/**
 * 지시서 서랍(UX-002): 다시 열기·복제·학습 상태. 화면을 막지 않는다(배경 잠금·포커스 가둠 없음).
 * 열면 제목으로 포커스를 옮기고, Esc로 닫는다.
 */
export function BriefDrawer({ briefs, briefId, onClose, onDuplicate }: Props) {
  const copy = useText()
  const [todoOnly, setTodoOnly] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const shown = todoOnly ? briefs.filter(needsAnalysis) : briefs
  const titleOf = (id: string) => briefs.find((b) => b.id === id)?.title ?? id

  useEffect(() => {
    heading.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside id={DRAWER_ID} className="bd" aria-labelledby={`${DRAWER_ID}-title`}>
      <header className="bd-head">
        <h2 id={`${DRAWER_ID}-title`} className="ltm-title" ref={heading} tabIndex={-1}>
          {copy.app.drawer.title}
        </h2>
        <button type="button" className="ltm-link" onClick={onClose}>
          {copy.app.drawer.close}
        </button>
      </header>
      <p className="bd-lead">{copy.app.drawer.lead}</p>
      <fieldset className="bd-filter">
        <legend className="sr-only">{copy.app.drawer.title}</legend>
        {[false, true].map((todo) => (
          <button
            key={String(todo)}
            type="button"
            className="bd-chip"
            aria-pressed={todoOnly === todo}
            onClick={() => setTodoOnly(todo)}
          >
            {todo
              ? `${copy.app.drawer.filterTodo} ${briefs.filter(needsAnalysis).length}`
              : `${copy.app.drawer.filterAll} ${briefs.length}`}
          </button>
        ))}
      </fieldset>
      {shown.length === 0 ? (
        <p className="bd-empty">{copy.app.drawer.nothingTodo}</p>
      ) : (
        <ul className="bd-list">
          {shown.map((b, i) => (
            <li key={b.id} className="bd-row" style={{ '--i': i } as React.CSSProperties}>
              <a
                className="bd-open"
                href={href({ kind: 'brief', id: b.id })}
                aria-current={b.id === briefId ? 'page' : undefined}
              >
                <span className="app-dot" data-ready={b.ready} aria-hidden>
                  {b.ready && <PixelSprite sprite={icons.check} scale={0.5} tint="currentColor" />}
                </span>
                <span className="bd-title">{b.title}</span>
                <span className="sr-only">
                  {b.ready ? copy.app.navigation.ready : copy.app.navigation.working}
                </span>
              </a>
              <div className="bd-meta">
                <LearningStamp status={b.learning} />
                {b.derivedFrom && (
                  <span className="bd-from">{copy.app.drawer.from(titleOf(b.derivedFrom))}</span>
                )}
              </div>
              <button
                type="button"
                className="ltm-link bd-duplicate"
                aria-label={copy.app.drawer.duplicateLabel(b.title)}
                onClick={() => onDuplicate(b)}
              >
                {copy.app.drawer.duplicate}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

/** 학습 상태 도장: 모양(점선·채움·화살표)과 글자를 함께 쓴다(시각 단서). 배운 것이 있으면 노트로 간다. */
function LearningStamp({ status }: { status: LearningStatus }) {
  const copy = useText()
  const { learning, learningHint } = copy.app.drawer
  if (status.kind === 'learned')
    return (
      <a
        className="bd-stamp"
        data-kind="learned"
        href={href({ kind: 'notes' })}
        title={learningHint.learned}
      >
        {learning.learned(status.count)}
      </a>
    )
  return (
    <span className="bd-stamp" data-kind={status.kind} title={learningHint[status.kind]}>
      {learning[status.kind]}
    </span>
  )
}
