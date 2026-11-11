import { useState } from 'react'
import { useText } from '../../copy/index.ts'
import { PixelButton } from '../../design/index.ts'
import type { PrefPatch } from '../../generated/PrefPatch.ts'

/** 사람이 직접 적는 새 기준. 저장에 실패하면 적은 내용을 지우지 않는다. */
export function NewNote({
  topics,
  onPatch,
}: {
  topics: string[]
  onPatch: (x: PrefPatch) => Promise<boolean>
}) {
  const copy = useText()
  const [topic, setTopic] = useState('')
  const [statement, setStatement] = useState('')
  return (
    <form
      className="pn-new"
      onSubmit={(e) => {
        e.preventDefault()
        if (!statement.trim()) return
        void onPatch({
          op: 'note',
          topic: topic.trim() || copy.preferences.notes.defaultTopic,
          statement: statement.trim(),
          evidence: copy.preferences.notes.manualEvidence,
        }).then((ok) => ok && setStatement(''))
      }}
    >
      <input
        className="ltm-input"
        list="pn-topics"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={copy.preferences.notes.topicPlaceholder}
        aria-label={copy.preferences.notes.topicLabel}
      />
      <datalist id="pn-topics">
        {topics.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <input
        className="ltm-input"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        placeholder={copy.preferences.notes.statementPlaceholder}
        aria-label={copy.preferences.notes.statementLabel}
        enterKeyHint="done"
      />
      <PixelButton type="submit" disabled={!statement.trim()}>
        {copy.preferences.notes.add}
      </PixelButton>
    </form>
  )
}
