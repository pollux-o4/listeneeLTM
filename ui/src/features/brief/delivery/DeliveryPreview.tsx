import './delivery.css'
import { useText } from '../../../copy/index.ts'
import type { Brief } from '../../../generated/Brief.ts'

type Props = {
  markdown: string
  brief: Brief
  draftOpen: boolean
  onShowDraft: () => void
}

/** 미리보기 줄 수: 무엇이 복사되는지 알아볼 만큼만. CSS의 --dp-lines와 같은 값이다. */
const PREVIEW_LINES = 7

/** 확인 전 항목의 제목들. 지시서 줄이 이 제목으로 끝나면 확인 전 줄로 표시한다(판정 원본은 코어, 여기선 표시만). */
function pendingTexts(brief: Brief): string[] {
  return Object.values(brief.sections)
    .flat()
    .filter((i) => i !== undefined && !i.confirmed)
    .map((i) => i?.text ?? '')
}

/** 복사 버튼 위 미리보기: 첫 줄들을 종이로 보이고, 확인 전 줄을 표시하고, 남은 분량을 알린다. */
export function DeliveryPreview({ markdown, brief, draftOpen, onShowDraft }: Props) {
  const copy = useText()
  const lines = markdown.trimEnd().split('\n')
  const shown = lines.slice(0, PREVIEW_LINES)
  const rest = lines.length - shown.length
  const pending = pendingTexts(brief)
  // 항목 줄과, 그보다 더 들여 쓴 바로 아래 자세히 줄들을 한 묶음으로 표시한다.
  const indent = (line: string) => line.length - line.trimStart().length
  let owner = -1
  const marks = shown.map((line) => {
    const t = line.replace(/^\s*-\s*/, '').trim()
    if (t !== '' && pending.includes(t)) {
      owner = indent(line)
      return true
    }
    if (owner >= 0 && t !== '' && indent(line) > owner) return true
    owner = -1
    return false
  })

  return (
    <figure className="dp-preview">
      <figcaption className="ltm-label">{copy.brief.delivery.previewLabel}</figcaption>
      <pre className="dp-sheet" data-more={rest > 0}>
        {shown.map((line, n) => (
          // 줄 내용이 같을 수 있어 순번을 키로 쓴다(미리보기는 재정렬되지 않는다).
          // biome-ignore lint/suspicious/noArrayIndexKey: 위 이유
          <span key={n} className="dp-line" data-unconfirmed={marks[n] || undefined}>
            {marks[n] && <span className="sr-only">{copy.brief.delivery.unconfirmedLine}: </span>}
            {line || ' '}
            {'\n'}
          </span>
        ))}
      </pre>
      {/* 전체는 초안 패널이 보여 준다: 열려 있거나 다 보이면 물러난다. */}
      {!draftOpen && rest > 0 && (
        <button type="button" className="ltm-link dp-more" onClick={onShowDraft}>
          {copy.brief.delivery.previewMore(rest)}
        </button>
      )}
    </figure>
  )
}
