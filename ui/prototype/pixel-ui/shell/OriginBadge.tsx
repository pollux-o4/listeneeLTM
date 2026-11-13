import type { Origin } from '../model/brief.ts'
import './shell.css'

/** 누가 썼는지: 공동 편집 계약의 최소 표시. */
export function OriginBadge({ origin, confirmed }: { origin: Origin; confirmed?: boolean }) {
  const label = origin === 'ai' ? 'AI' : '나'
  return (
    <span
      className="ob"
      data-origin={origin}
      data-confirmed={confirmed ?? true}
      title={confirmed === false ? '확인 전' : undefined}
    >
      {label}
      {confirmed === false && <span className="sr-only"> 작성, 확인 전</span>}
    </span>
  )
}
