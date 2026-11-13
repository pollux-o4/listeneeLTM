import { useEffect, useRef } from 'react'
import { assemble, summarize } from '../../model/brief.ts'
import type { VariantProps } from '../../model/props.ts'
import { PixelButton, PixelMeter } from '../../primitives/index.tsx'
import { Mascot } from '../../scenes/Mascot.tsx'
import { CopyBrief } from '../../shell/CopyBrief.tsx'
import { OriginBadge } from '../../shell/OriginBadge.tsx'
import './focus.css'

/** C · 한 가지씩: 화면에는 지금 내릴 판단 하나와 조립 중인 결과물만. 최소 질문 계약을 극단까지 밀어본 시안. */
export function Focus({ state, dispatch }: VariantProps) {
  const sum = summarize(state)
  const decision = sum.pending[0]
  const review = decision ? undefined : sum.unconfirmed[0]
  const total = state.decisions.length + state.sections.flatMap((s) => s.items).length
  const left = sum.pending.length + sum.unconfirmed.length

  const text = assemble(state)
  const prev = useRef(new Set(text.split('\n')))
  const fresh = text.split('\n').filter((l) => !prev.current.has(l))
  useEffect(() => {
    const t = setTimeout(() => {
      prev.current = new Set(text.split('\n'))
    }, 1800)
    return () => clearTimeout(t)
  }, [text])

  return (
    <div className="fc">
      <section className="fc-stage" aria-live="polite">
        <div className="fc-progress">
          <span className="px-label">남은 판단 {left}</span>
          <PixelMeter
            value={Math.max(0, Math.min(8, Math.round(((total - left) / total) * 8)))}
            max={8}
            label="진행"
          />
        </div>

        {decision && (
          <article key={decision.id} className="fc-card">
            <Mascot mood="thinking" scale={3} />
            <p className="px-label">
              {state.sections.find((s) => s.key === decision.section)?.label}
            </p>
            <h2 className="fc-q">{decision.question}</h2>
            <p className="fc-why">{decision.why}</p>
            <div className="fc-opts">
              {decision.options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className="fc-opt"
                  data-recommended={o.id === decision.recommended}
                  onClick={() => dispatch({ type: 'choose', decision: decision.id, option: o.id })}
                >
                  <span className="fc-opt-label">{o.label}</span>
                  <span className="fc-opt-note">{o.note}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="fc-skip"
              onClick={() => dispatch({ type: 'acceptAll' })}
            >
              나머지는 리스니 추천대로 ↵
            </button>
          </article>
        )}

        {review && (
          <article key={review.id} className="fc-card">
            <Mascot mood="listening" scale={3} />
            <p className="px-label">AI가 쓴 내용 확인</p>
            <h2 className="fc-q">
              <OriginBadge origin={review.origin} confirmed={false} /> {review.text}
            </h2>
            <p className="fc-why">
              맞으면 확인, 아니면 빼 주세요. 고치고 싶으면 AI에게 말하면 돼요.
            </p>
            <div className="fc-row">
              <PixelButton onClick={() => dispatch({ type: 'confirm', item: review.id })}>
                ✓ 맞아요
              </PixelButton>
              <PixelButton onClick={() => dispatch({ type: 'remove', item: review.id })}>
                빼기
              </PixelButton>
            </div>
          </article>
        )}

        {!decision && !review && (
          <article className="fc-card fc-done">
            <Mascot mood="happy" scale={4} />
            <h2 className="fc-q">{sum.ready ? '전달 준비 완료' : '필수 항목이 비어 있어요'}</h2>
            <p className="fc-why">
              {sum.ready
                ? '오른쪽 지시서를 그대로 AI나 사람에게 넘기면 돼요.'
                : `${sum.missing.map((s) => s.label).join(', ')}을(를) AI에게 채워 달라고 해 보세요.`}
            </p>
            <div className="fc-row">
              <CopyBrief state={state} ready={sum.ready} />
              <PixelButton onClick={() => dispatch({ type: 'undo' })}>
                ↶ 마지막 판단 취소
              </PixelButton>
            </div>
          </article>
        )}

        <ol className="fc-ticker" aria-label="최근 변경">
          {state.changes.slice(0, 3).map((c) => (
            <li key={c.id}>
              <OriginBadge origin={c.who} /> {c.summary}
            </li>
          ))}
        </ol>
      </section>

      <aside className="fc-paper" aria-label="조립 중인 지시서">
        <div className="fc-paper-head">
          <span className="px-label">지시서 미리보기</span>
          <button
            type="button"
            className="fc-skip"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={!state.history.length}
          >
            ↶
          </button>
        </div>
        <pre>
          {keyedLines(text).map(({ line, key }) => (
            <span
              key={key}
              className="fc-line"
              data-fresh={fresh.includes(line)}
              data-heading={line.startsWith('#')}
            >
              {line || ' '}
              {'\n'}
            </span>
          ))}
        </pre>
      </aside>
    </div>
  )
}

/** 같은 줄이 반복돼도 안정적인 키: 내용 + 등장 순번. */
function keyedLines(text: string) {
  const seen = new Map<string, number>()
  return text.split('\n').map((line) => {
    const n = (seen.get(line) ?? 0) + 1
    seen.set(line, n)
    return { line, key: `${line}#${n}` }
  })
}
