import { useId, useState } from 'react'
import { useText } from '../copy/index.ts'
import { useCopy } from '../design/index.ts'

/** 줄바꿈·연속 공백을 한 칸으로: AI 대화창에서 줄바꿈이 전송으로 끊기지 않게. */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * 처음 연 화면의 할 일: 하고 싶은 일(필수 아님)과 세부 조건(목적을 적으면 열림)을 한 줄 요청 문장으로 만들어 복사한다.
 * AI가 과업·조건을 되묻지 않고 한 번에 쓰게 하는 것이 목적이다.
 */
export function WelcomeAsk() {
  const s = useText().app.screen
  const { state, copy } = useCopy()
  const [task, setTask] = useState('')
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<readonly string[]>([])
  const [extra, setExtra] = useState('')
  const ids = { task: useId(), details: useId(), extra: useId() }

  const purpose = oneLine(task)
  // 목적을 적어야 세부 조건이 열린다(해금). 지우면 다시 잠기고, 고른 조건은 남겨 두되 문장에서 뺀다.
  const unlocked = purpose !== ''
  const details = unlocked ? [...picked, oneLine(extra)].filter(Boolean) : []
  const phrase = s.askAiWith(purpose, details)
  const toggle = (d: string) =>
    setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))

  return (
    <form
      className="app-ask"
      onSubmit={(e) => {
        e.preventDefault()
        copy(phrase)
      }}
    >
      <div className="app-ask-field">
        <label className="ltm-label" htmlFor={ids.task}>
          {s.taskLabel}
        </label>
        <input
          id={ids.task}
          className="ltm-input"
          placeholder={s.taskPlaceholder}
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
      </div>

      {/* 해금 전에도 자리를 잡아 둔다: 버튼이 나타날 때 아래 문장이 밀리지 않게 */}
      <div className="app-ask-slot">
        {unlocked && (
          <button
            type="button"
            className="app-ask-more ltm-link"
            aria-expanded={open}
            aria-controls={ids.details}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? s.detailsHide : s.detailsShow}
            {details.length > 0 && ` · ${details.length}`}
          </button>
        )}
      </div>

      {unlocked && open && (
        <fieldset id={ids.details} className="app-ask-details">
          <legend className="ltm-label">{s.detailsLegend}</legend>
          <div className="app-ask-chips">
            {s.detailPresets.map((d) => (
              <button
                key={d}
                type="button"
                className="ltm-chip"
                aria-pressed={picked.includes(d)}
                onClick={() => toggle(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <label className="ltm-label" htmlFor={ids.extra}>
            {s.detailsExtra}
          </label>
          <textarea
            id={ids.extra}
            className="ltm-input app-ask-extra"
            rows={2}
            placeholder={s.detailsExtraPlaceholder}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        </fieldset>
      )}

      <button type="submit" className="app-phrase">
        <span>“{phrase}”</span>
        <span className="ltm-label" aria-live="polite">
          {state === 'copied' ? s.copied : state === 'failed' ? s.copyFailed : s.copyHint}
        </span>
      </button>
    </form>
  )
}
