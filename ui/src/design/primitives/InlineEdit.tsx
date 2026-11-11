import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 제자리 고치기의 상태: 누가 열었는지 기억해, 닫히면 그 버튼으로 포커스를 돌려준다
 * (키보드 사용자가 고친 뒤 제자리를 잃지 않게).
 */
export function useEditToggle<T extends HTMLElement = HTMLButtonElement>() {
  const [editing, setEditing] = useState(false)
  const trigger = useRef<T>(null)
  const wasEditing = useRef(false)
  useEffect(() => {
    if (wasEditing.current && !editing) trigger.current?.focus()
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
}

/** 한 줄 제자리 입력: 열리면 전체 선택, Enter·포커스 이동은 저장, Esc는 취소. */
export function InlineEdit({ value, label, onSave, onClose, className = '' }: Props) {
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

  return (
    <input
      ref={input}
      className={`ltm-input ${className}`}
      defaultValue={value}
      aria-label={label}
      onBlur={() => close(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') close(true)
        if (e.key === 'Escape') close(false)
      }}
    />
  )
}
