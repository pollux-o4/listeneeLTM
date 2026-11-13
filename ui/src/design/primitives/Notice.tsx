import { useText } from '../../copy/index.ts'
export type NoticeContent = {
  text: string
  /** 한 번 누르면 끝나는 후속 행동(다시 시도, 되돌리기) */
  action?: { label: string; run: () => void }
}

/** 화면을 막지 않는 알림. 아래에 떠 있다가 스스로 사라진다(사라지는 시점은 호출 측이 정한다). */
export function Notice({
  notice,
  onClose,
}: {
  notice: NoticeContent | undefined
  onClose: () => void
}) {
  const text = useText().common
  return (
    <div className="ltm-notice-region" role="status" aria-live="polite">
      {notice && (
        <div className="ltm-notice">
          <span>{notice.text}</span>
          {notice.action && (
            <button
              type="button"
              className="ltm-link"
              onClick={() => {
                onClose()
                notice.action?.run()
              }}
            >
              {notice.action.label}
            </button>
          )}
          <button
            type="button"
            className="ltm-icon"
            aria-label={text.notice.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
