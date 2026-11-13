import { useText } from '../../copy/index.ts'
/** 누가 썼는지(공동 편집). 확인 전이면 점선. 모양·색·글자로 함께 구분한다. */
export function OriginBadge({ by, confirmed = true }: { by: 'ai' | 'me'; confirmed?: boolean }) {
  const text = useText().common
  return (
    <span className="ltm-origin" data-by={by} data-confirmed={confirmed}>
      {by === 'ai' ? text.origin.ai : text.origin.me}
      <span className="sr-only">{confirmed ? text.origin.written : text.origin.unconfirmed}</span>
    </span>
  )
}
