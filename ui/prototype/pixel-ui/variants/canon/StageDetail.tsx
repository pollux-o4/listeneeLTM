import { useState } from 'react'
import type { Section } from '../../model/brief.ts'
import type { VariantProps } from '../../model/props.ts'
import { PixelButton, PixelPanel } from '../../primitives/index.tsx'
import { OriginBadge } from '../../shell/OriginBadge.tsx'

type Props = VariantProps & {
  section: Section
  index: number
  total: number
  onMove: (i: number) => void
}

/** 펼친 한 단계: 갈림길(B) → 항목 확인·삭제·추가(A). */
export function StageDetail({ state, dispatch, section, index, total, onMove }: Props) {
  const forks = state.decisions.filter((d) => d.section === section.key && !d.chosen)
  const unconfirmed = section.items.filter((i) => !i.confirmed)
  const [text, setText] = useState('')

  return (
    <PixelPanel key={section.key} enterIndex={0} className="cn-detail">
      <div className="cn-detail-head">
        <h2 className="px-title">
          {index + 1}. {section.label} <span className="px-label">— {section.hint}</span>
        </h2>
        <div className="cn-row">
          <PixelButton
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            aria-label="이전 단계"
          >
            ◀
          </PixelButton>
          <PixelButton
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
            aria-label="다음 단계"
          >
            ▶
          </PixelButton>
        </div>
      </div>

      {forks.map((d) => (
        <div key={d.id} className="cn-fork">
          <p className="cn-q">갈림길 · {d.question}</p>
          <div className="cn-paths">
            {d.options.map((o) => (
              <button
                type="button"
                key={o.id}
                className="cn-pathcard"
                data-recommended={o.id === d.recommended}
                onClick={() => dispatch({ type: 'choose', decision: d.id, option: o.id })}
              >
                <strong>{o.label}</strong>
                <span>{o.note}</span>
                {o.id === d.recommended && <em className="px-label">리스니 추천</em>}
              </button>
            ))}
          </div>
          <details className="cn-why">
            <summary className="px-label">왜 묻나요?</summary>
            {d.why}
          </details>
        </div>
      ))}

      <ul className="cn-items">
        {section.items.map((it) => (
          <li key={it.id} data-confirmed={it.confirmed}>
            <OriginBadge origin={it.origin} confirmed={it.confirmed} />
            <span className="cn-text">{it.text}</span>
            {!it.confirmed && (
              <button
                type="button"
                className="cn-mini cn-ok"
                onClick={() => dispatch({ type: 'confirm', item: it.id })}
              >
                좋아요
              </button>
            )}
            <button
              type="button"
              className="cn-mini"
              aria-label={`${it.text} 빼기`}
              onClick={() => dispatch({ type: 'remove', item: it.id })}
            >
              ×
            </button>
          </li>
        ))}
        {!section.items.length && !forks.length && (
          <li className="cn-empty">
            {section.required
              ? '필수 단계예요. AI에게 "채워줘"라고 하거나 직접 적어 주세요.'
              : '비워 둬도 돼요.'}
          </li>
        )}
      </ul>

      <div className="cn-detail-foot">
        <form
          className="cn-add"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) dispatch({ type: 'add', section: section.key, text: text.trim() })
            setText('')
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="+ 직접 적기"
            aria-label={`${section.label}에 추가`}
          />
        </form>
        {unconfirmed.length > 1 && (
          <button
            type="button"
            className="cn-link"
            onClick={() => dispatch({ type: 'confirmSection', section: section.key })}
          >
            이 단계 모두 좋아요
          </button>
        )}
      </div>
    </PixelPanel>
  )
}
