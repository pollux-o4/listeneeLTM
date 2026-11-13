import { useCallback, useEffect, useRef, useState } from 'react'
import { useText } from '../../copy/index.ts'

/**
 * 제자리 고치기의 상태: 누가 열었는지 기억해, 닫히면 그 버튼으로 포커스를 돌려준다
 * (키보드 사용자가 고친 뒤 제자리를 잃지 않게).
 */
export function useEditToggle<T extends HTMLElement = HTMLButtonElement>() {
  const [editing, setEditing] = useState(false)
  const trigger = useRef<T>(null)
  const wasEditing = useRef(false)
  useEffect(() => {
    // 닫히면 연 버튼으로 돌아가되 화면은 움직이지 않는다(쓰던 자리를 잃지 않게).
    if (wasEditing.current && !editing) trigger.current?.focus({ preventScroll: true })
    wasEditing.current = editing
  }, [editing])
  const start = useCallback(() => setEditing(true), [])
  const stop = useCallback(() => setEditing(false), [])
  return { editing, start, stop, trigger }
}

type Props = {
  value: string
  /** 보조기기용 이름 */
  label: string
  /** 바뀐 값이 있을 때만 호출된다. */
  onSave: (next: string) => void
  /** 저장·취소 어느 쪽이든 끝나면 호출된다. */
  onClose: () => void
  className?: string
  /** 빈 칸일 때 무엇을 적는지 보이는 예시. */
  placeholder?: string
  /** 저장 키캡의 이름. 저장이 아닌 일(예: 보내기)이면 그 말로. */
  saveLabel?: string
}

/**
 * 한 줄 제자리 입력: 열리면 전체 선택, Enter·포커스 이동은 저장, Esc는 취소.
 * 글자는 원래 자리의 글꼴 그대로, 밑줄 하나가 '고치는 중'을 알린다. 아래 키캡은 단축키 안내이자 버튼이다.
 */
export function InlineEdit({
  value,
  label,
  onSave,
  onClose,
  className = '',
  placeholder,
  saveLabel,
}: Props) {
  const text = useText().common.edit
  const input = useRef<HTMLInputElement>(null)
  const closed = useRef(false)
  useEffect(() => input.current?.select(), [])

  const close = (save: boolean) => {
    if (closed.current) return
    closed.current = true
    const next = input.current?.value.trim() ?? ''
    if (save && next && next !== value) onSave(next)
    onClose()
  }

  // 키캡을 눌러도 입력이 먼저 포커스를 잃어(=저장) 취소가 묻히지 않게 한다.
  const keep = (e: React.MouseEvent) => e.preventDefault()
  return (
    <span className={`ltm-edit ${className}`}>
      <span className="ltm-edit-field">
        <input
          ref={input}
          className="ltm-edit-input"
          defaultValue={value}
          aria-label={label}
          placeholder={placeholder}
          onBlur={() => close(true)}
          onKeyDown={(e) => {
            // 한글 등 조합 중의 Enter는 글자를 확정하는 키라 저장으로 보지 않는다.
            if (e.nativeEvent.isComposing) return
            // 기본 동작을 막아, 닫히며 돌아간 버튼에 같은 Enter가 '누르기'로 전달되지 않게 한다.
            if (e.key === 'Enter') {
              e.preventDefault()
              close(true)
            }
            if (e.key === 'Escape') close(false)
          }}
        />
      </span>
      <span className="ltm-edit-keys">
        <button type="button" onMouseDown={keep} onClick={() => close(true)}>
          <kbd>↵</kbd>
          {saveLabel ?? text.save}
        </button>
        <button type="button" onMouseDown={keep} onClick={() => close(false)}>
          <kbd>Esc</kbd>
          {text.cancel}
        </button>
      </span>
    </span>
  )
}
