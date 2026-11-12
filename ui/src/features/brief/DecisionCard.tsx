import { useEffect, useRef, useState } from 'react'
import { useText } from '../../copy/index.ts'
import { OriginBadge, PixelSprite, stageIcons, useEditToggle } from '../../design/index.ts'
import type { BriefPatch } from '../../generated/BriefPatch.ts'
import type { Decision } from '../../generated/Decision.ts'
import type { Item } from '../../generated/Item.ts'
import type { Request } from '../../generated/Request.ts'
import { RequestThread } from './RequestThread.tsx'

/** 잠든 갈림길이 기다리는 앞 선택: 그 질문과, 골라야 깨어나는 선택지 이름들. */
export type Waiting = { question: string; labels: string[] }

/** 선택지를 고르면 다른 갈림길에 생기는 변화: 잠드는 질문(정해 둔 답이 있으면 그 이름)과 새로 열리는 질문. */
export type Effect = { sleeps: { question: string; dropped?: string }[]; wakes: string[] }

type Props = {
  decision: Decision
  derived?: Item | undefined
  /** 있으면 잠든 갈림길: 흐리게·잠금으로, 무엇을 고르면 묻는지 보인다(UX-001 갈림길 의존). */
  waiting?: Waiting | undefined
  /** 선택지 id별 영향. 있는 선택지만 고르기 전에 영향을 보인다. */
  effects?: Record<string, Effect>
  /** 고른 뒤 알림의 되돌리기. */
  onUndo?: (() => void) | undefined
  /** 이 갈림길에 AI에게 남긴 요청들. */
  requests?: Request[]
  onPatch: (p: BriefPatch) => void
}

/** 영향을 한 줄 문장들로. 미리 보기와 고른 뒤 알림이 같은 말을 쓴다. */
function useEffectText() {
  const copy = useText()
  return (e: Effect) => [
    ...e.sleeps.map((s) => copy.brief.decision.sleeps(s.question, s.dropped)),
    ...e.wakes.map((q) => copy.brief.decision.wakes(q)),
  ]
}

/**
 * 갈림길. 열려 있으면 선택지를 펼치고, 정해졌으면 한 줄로 접는다("AI가 정함 · 바꾸기").
 * 정해진 것도 언제든 다시 펼쳐 바꿀 수 있다(되돌릴 수 없는 흐름 금지).
 */
export function DecisionCard({
  decision: d,
  derived,
  waiting,
  effects = {},
  onUndo,
  requests = [],
  onPatch,
}: Props) {
  const copy = useText()
  const effectText = useEffectText()
  // 방금 고른 선택이 다른 갈림길을 바꿨으면 그 자리에 알린다(확인 창 대신 알림 + 되돌리기).
  const [notice, setNotice] = useState<string[]>([])
  const ask = useEditToggle()
  const askButton = (
    <button
      type="button"
      className="ltm-link"
      ref={ask.trigger}
      aria-expanded={ask.editing}
      aria-label={copy.brief.request.askLabel(d.question)}
      title={`${copy.brief.request.ask} · ${copy.brief.request.photoHint}`}
      onClick={ask.editing ? ask.stop : ask.start}
    >
      {copy.brief.request.ask}
    </button>
  )
  const thread = (
    <RequestThread
      target={{ kind: 'decision', id: d.id }}
      requests={requests}
      asking={ask.editing}
      onClose={ask.stop}
      onPatch={onPatch}
    />
  )
  const { editing: changing, start, stop, trigger } = useEditToggle()
  const options = useRef<HTMLDivElement>(null)
  const chosen = d.chosen ? d.options.find((o) => o.id === d.chosen) : undefined
  const unconfirmed = derived !== undefined && !derived.confirmed

  // 다시 펼치면 지금 고른 선택지에서 시작한다.
  useEffect(() => {
    if (changing)
      options.current?.querySelector<HTMLElement>('[aria-pressed="true"], button')?.focus()
  }, [changing])

  const choose = (option: string) => {
    stop()
    const effect = effects[option]
    setNotice(option !== d.chosen && effect ? effectText(effect) : [])
    if (option !== d.chosen) onPatch({ op: 'choose', decision: d.id, option })
    else if (derived && unconfirmed) onPatch({ op: 'confirmItem', id: derived.id })
  }

  if (waiting) {
    return (
      <div className="dc-dormant">
        <span className="dc-dormant-lock" aria-hidden>
          <PixelSprite sprite={stageIcons.lock} scale={2 / 3} />
        </span>
        <span className="dc-decided-text">
          <span className="dc-dormant-q">{d.question}</span>
          <span className="ltm-label">
            {copy.brief.decision.waiting(waiting.question, waiting.labels)}
          </span>
        </span>
      </div>
    )
  }

  const noticeLine = notice.length > 0 && (
    <p className="dc-notice ltm-label" role="status">
      <span>
        {copy.brief.decision.changedPrefix}
        {notice.join(' · ')}
      </span>
      {onUndo && (
        <button
          type="button"
          className="ltm-link"
          onClick={() => {
            setNotice([])
            onUndo()
          }}
        >
          {copy.brief.decision.undo}
        </button>
      )}
    </p>
  )

  if (chosen && !changing) {
    return (
      <>
        <div className="dc-decided" data-confirmed={!unconfirmed}>
          <OriginBadge by={d.chosenBy ?? 'me'} confirmed={!unconfirmed} />
          <span className="dc-decided-text">
            <span className="ltm-label">{d.question}</span>
            <strong>{chosen.label}</strong>
          </span>
          {derived && unconfirmed && (
            <button
              type="button"
              className="ltm-link"
              aria-label={copy.brief.decision.confirmLabel(d.question, chosen.label)}
              onClick={() => onPatch({ op: 'confirmItem', id: derived.id })}
            >
              {copy.brief.decision.confirm}
            </button>
          )}
          {askButton}
          <button
            type="button"
            className="ltm-link"
            ref={trigger}
            aria-label={copy.brief.decision.changeLabel(d.question)}
            onClick={start}
          >
            {copy.brief.decision.change}
          </button>
        </div>
        {noticeLine}
        {thread}
      </>
    )
  }

  return (
    <fieldset className="dc">
      <legend className="dc-q">
        <span aria-hidden>◆ </span>
        {d.question}
      </legend>
      {d.why && <p className="dc-why">{d.why}</p>}
      <div className="dc-options" ref={options}>
        {d.options.map((o) => (
          <button
            type="button"
            key={o.id}
            className="dc-option"
            data-recommended={o.id === d.recommended}
            aria-pressed={o.id === d.chosen}
            onClick={() => choose(o.id)}
          >
            <span className="dc-option-head">
              <strong>{o.label}</strong>
              {o.id === d.recommended && <em>{copy.brief.decision.recommended}</em>}
            </span>
            {o.note && <span className="dc-note">{o.note}</span>}
            {o.id !== d.chosen && effects[o.id] && (
              <span className="dc-impact">
                <span aria-hidden>⚑ </span>
                {copy.brief.decision.impactPrefix}
                {effectText(effects[o.id] as Effect).join(' · ')}
              </span>
            )}
            <span className="dc-text">
              <span aria-hidden>→ </span>
              <span className="sr-only">{copy.brief.decision.sentencePrefix}</span>
              {o.text}
            </span>
          </button>
        ))}
      </div>
      <div className="dc-foot">
        {changing && (
          <button type="button" className="ltm-link dc-keep" onClick={stop}>
            {copy.brief.decision.keep}
          </button>
        )}
        {askButton}
      </div>
      {noticeLine}
      {thread}
    </fieldset>
  )
}
