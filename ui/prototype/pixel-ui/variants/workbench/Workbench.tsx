import { useState } from 'react'
import { type BriefState, summarize } from '../../model/brief.ts'
import type { VariantProps } from '../../model/props.ts'
import { PixelButton, PixelMeter, PixelPanel } from '../../primitives/index.tsx'
import { Mascot } from '../../scenes/Mascot.tsx'
import { CopyBrief } from '../../shell/CopyBrief.tsx'
import { OriginBadge } from '../../shell/OriginBadge.tsx'
import './workbench.css'

/** A · 작업대: 문서 중심 3열. 왼쪽 개요, 가운데 지시서, 오른쪽 결정·기록. 숙련 사용자의 훑어보기에 맞춤. */
export function Workbench({ state, dispatch }: VariantProps) {
  const sum = summarize(state)
  const [focus, setFocus] = useState<string>()
  const statusOf = (key: string) => {
    const sec = state.sections.find((x) => x.key === key) as BriefState['sections'][number]
    if (state.decisions.some((d) => d.section === key && !d.chosen)) return 'ask'
    if (sec.required && !sec.items.length) return 'missing'
    return sec.items.some((i) => !i.confirmed) ? 'review' : 'ok'
  }

  return (
    <div className="wb">
      <header className="wb-top">
        <Mascot mood={sum.ready ? 'happy' : 'idle'} scale={2} />
        <h1 className="px-title">{state.title}</h1>
        <div className="wb-meter">
          <span className="px-label">
            필수 {sum.filled}/{sum.required.length} · 결정{' '}
            {state.decisions.length - sum.pending.length}/{state.decisions.length}
          </span>
          <PixelMeter
            value={sum.filled + state.decisions.length - sum.pending.length}
            max={sum.required.length + state.decisions.length}
            label="완성도"
          />
        </div>
        <PixelButton onClick={() => dispatch({ type: 'undo' })} disabled={!state.history.length}>
          ↶ 되돌리기
        </PixelButton>
        <CopyBrief state={state} ready={sum.ready} />
      </header>

      <nav className="wb-outline" aria-label="개요">
        {state.sections.map((sec) => (
          <a
            key={sec.key}
            href={`#wb-${sec.key}`}
            className="wb-link"
            data-status={statusOf(sec.key)}
            onClick={() => setFocus(sec.key)}
          >
            <span className="wb-dot" aria-hidden />
            {sec.label}
          </a>
        ))}
        <p className="wb-legend px-label">● 완료 ◆ 정할 것 ▲ 비어 있음 ○ 확인 전</p>
      </nav>

      <main className="wb-doc">
        {state.sections.map((sec, i) => (
          <PixelPanel key={sec.key} enterIndex={i}>
            <section id={`wb-${sec.key}`} data-focus={focus === sec.key}>
              <div className="wb-sec-head">
                <h2 className="px-title">{sec.label}</h2>
                <span className="px-label">{sec.hint}</span>
              </div>
              {sec.items.length ? (
                <ul className="wb-items">
                  {sec.items.map((it) => (
                    <li key={it.id} data-confirmed={it.confirmed}>
                      <OriginBadge origin={it.origin} confirmed={it.confirmed} />
                      <span className="wb-text">{it.text}</span>
                      {!it.confirmed && (
                        <button
                          type="button"
                          className="wb-mini"
                          onClick={() => dispatch({ type: 'confirm', item: it.id })}
                        >
                          확인
                        </button>
                      )}
                      <button
                        type="button"
                        className="wb-mini"
                        aria-label={`${it.text} 삭제`}
                        onClick={() => dispatch({ type: 'remove', item: it.id })}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="wb-empty">{sec.required ? '필수: 아직 비어 있어요' : '없음'}</p>
              )}
              <AddLine onAdd={(text) => dispatch({ type: 'add', section: sec.key, text })} />
            </section>
          </PixelPanel>
        ))}
      </main>

      <aside className="wb-rail" aria-label="결정과 기록">
        <h2 className="px-title">정할 것 {sum.pending.length}</h2>
        {sum.pending.map((d) => (
          <PixelPanel key={d.id} tone="accent">
            <p className="wb-q">{d.question}</p>
            <div className="wb-opts">
              {d.options.map((o) => (
                <PixelButton
                  key={o.id}
                  onClick={() => dispatch({ type: 'choose', decision: d.id, option: o.id })}
                >
                  {o.id === d.recommended ? '★ ' : ''}
                  {o.label}
                </PixelButton>
              ))}
            </div>
            <details className="wb-why">
              <summary className="px-label">왜 묻나요?</summary>
              {d.why}
            </details>
          </PixelPanel>
        ))}
        {sum.pending.length > 1 && (
          <button
            type="button"
            className="wb-link-btn"
            onClick={() => dispatch({ type: 'acceptAll' })}
          >
            남은 건 추천대로 →
          </button>
        )}
        <h2 className="px-title">기록</h2>
        <ol className="wb-log">
          {state.changes.slice(0, 6).map((c) => (
            <li key={c.id}>
              <OriginBadge origin={c.who} /> {c.summary}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}

function AddLine({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <form
      className="wb-add"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onAdd(text.trim())
        setText('')
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="+ 직접 추가"
        aria-label="항목 추가"
      />
    </form>
  )
}
