import { type CSSProperties, useState } from 'react'
import { assemble, type SectionKey, summarize } from '../../model/brief.ts'
import type { VariantProps } from '../../model/props.ts'
import { PixelButton, PixelPanel, PixelSprite, SpeechBubble } from '../../primitives/index.tsx'
import { Mascot } from '../../scenes/Mascot.tsx'
import { CopyBrief } from '../../shell/CopyBrief.tsx'
import { OriginBadge } from '../../shell/OriginBadge.tsx'
import { chest } from '../../sprites/props.ts'
import './questmap.css'

/** B · 여정 지도: 섹션을 길 위의 단계로. 한 번에 한 단계만 펼친다(점진 공개). 초보 사용자의 "지금 어디?"에 맞춤. */
export function QuestMap({ state, dispatch }: VariantProps) {
  const sum = summarize(state)
  const stageState = (key: SectionKey) => {
    const sec = state.sections.find((s) => s.key === key)
    if (state.decisions.some((d) => d.section === key && !d.chosen)) return 'fork'
    if (sec?.required && !sec.items.length) return 'empty'
    return 'clear'
  }
  const current = state.sections.findIndex((s) => stageState(s.key) !== 'clear')
  const here = current === -1 ? state.sections.length : current
  const [open, setOpen] = useState<number>(Math.min(here, state.sections.length - 1))
  const sec = state.sections[open]
  const forks = state.decisions.filter((d) => d.section === sec?.key && !d.chosen)

  const say = sum.ready
    ? '상자가 열렸어요! 완성된 지시서를 가져가세요.'
    : here < state.sections.length
      ? `"${state.sections[here]?.label}" 단계에서 기다리고 있어요.`
      : '거의 다 왔어요.'

  return (
    <div className="qm">
      <header className="qm-head">
        <h1 className="px-title">{state.title}</h1>
        <SpeechBubble key={say} text={say} />
      </header>

      <ol className="qm-path" style={{ '--n': state.sections.length + 1 } as CSSProperties}>
        <li className="qm-walker" style={{ '--at': here } as CSSProperties} aria-hidden>
          <Mascot mood={sum.ready ? 'happy' : forks.length ? 'thinking' : 'listening'} scale={2} />
        </li>
        {state.sections.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className="qm-node"
              data-state={stageState(s.key)}
              aria-current={open === i ? 'step' : undefined}
              onClick={() => setOpen(i)}
            >
              <span className="qm-tile" aria-hidden>
                {stageState(s.key) === 'fork' ? '?' : stageState(s.key) === 'empty' ? '!' : '✓'}
              </span>
              <span className="qm-name">{s.label}</span>
            </button>
          </li>
        ))}
        <li>
          <div className="qm-node qm-goal" data-state={sum.ready ? 'clear' : 'locked'}>
            <PixelSprite
              sprite={sum.ready ? chest.open : chest.closed}
              scale={2}
              label={sum.ready ? '열린 상자' : '잠긴 상자'}
            />
            <span className="qm-name">전달</span>
          </div>
        </li>
      </ol>

      {sec && (
        <PixelPanel key={sec.key} enterIndex={0} className="qm-detail">
          <div className="qm-detail-head">
            <h2 className="px-title">
              {open + 1}. {sec.label} <span className="px-label">— {sec.hint}</span>
            </h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <PixelButton disabled={open === 0} onClick={() => setOpen(open - 1)}>
                ◀
              </PixelButton>
              <PixelButton
                disabled={open === state.sections.length - 1}
                onClick={() => setOpen(open + 1)}
              >
                ▶
              </PixelButton>
            </div>
          </div>

          {forks.map((d) => (
            <div key={d.id} className="qm-fork">
              <p className="qm-q">갈림길 · {d.question}</p>
              <div className="qm-paths">
                {d.options.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    className="qm-pathcard"
                    data-recommended={o.id === d.recommended}
                    onClick={() => dispatch({ type: 'choose', decision: d.id, option: o.id })}
                  >
                    <strong>{o.label}</strong>
                    <span>{o.note}</span>
                    {o.id === d.recommended && <em className="px-label">리스니 추천</em>}
                  </button>
                ))}
              </div>
              <p className="qm-why">{d.why}</p>
            </div>
          ))}

          <ul className="qm-items">
            {sec.items.map((it) => (
              <li key={it.id}>
                <OriginBadge origin={it.origin} confirmed={it.confirmed} /> {it.text}
                {!it.confirmed && (
                  <button
                    type="button"
                    className="qm-ok"
                    onClick={() => dispatch({ type: 'confirm', item: it.id })}
                  >
                    좋아요
                  </button>
                )}
              </li>
            ))}
            {!sec.items.length && !forks.length && (
              <li className="qm-empty">
                비어 있어요. AI에게 "채워줘"라고 하거나 아래에 적어 주세요.
              </li>
            )}
          </ul>
        </PixelPanel>
      )}

      {sum.ready && (
        <PixelPanel enterIndex={1} tone="accent" className="qm-loot">
          <div className="qm-detail-head">
            <h2 className="px-title">완성된 지시서</h2>
            <CopyBrief state={state} ready />
          </div>
          <pre>{assemble(state)}</pre>
        </PixelPanel>
      )}
    </div>
  )
}
