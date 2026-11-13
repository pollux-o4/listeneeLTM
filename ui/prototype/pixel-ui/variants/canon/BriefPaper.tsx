import { useEffect, useRef } from 'react'
import type { Change } from '../../model/brief.ts'
import { OriginBadge } from '../../shell/OriginBadge.tsx'

/** 조립 중인 지시서(C) + 최근 변경(A). 새로 생긴 줄은 잠시 빛난다. 전체 훑어보기 역할도 한다. */
export function BriefPaper({
  text,
  changes,
  onLine,
}: {
  text: string
  changes: Change[]
  onLine?: (heading: string) => void
}) {
  const prev = useRef(new Set(text.split('\n')))
  const fresh = new Set(text.split('\n').filter((l) => !prev.current.has(l)))
  useEffect(() => {
    const t = setTimeout(() => {
      prev.current = new Set(text.split('\n'))
    }, 1800)
    return () => clearTimeout(t)
  }, [text])

  return (
    <aside className="cn-paper" aria-label="지시서 미리보기">
      <p className="px-label">지시서 미리보기</p>
      <pre>
        {keyedLines(text).map(({ line, key }) =>
          line.startsWith('## ') && onLine ? (
            <button
              type="button"
              key={key}
              className="cn-line cn-heading"
              data-fresh={fresh.has(line)}
              onClick={() => onLine(line.slice(3))}
            >
              {line}
            </button>
          ) : (
            <span
              key={key}
              className="cn-line"
              data-fresh={fresh.has(line)}
              data-heading={line.startsWith('#')}
            >
              {line || ' '}
              {'\n'}
            </span>
          ),
        )}
      </pre>
      <details className="cn-log" open>
        <summary className="px-label">최근 변경</summary>
        <ol>
          {changes.slice(0, 5).map((c) => (
            <li key={c.id}>
              <OriginBadge origin={c.who} /> {c.summary}
            </li>
          ))}
        </ol>
      </details>
    </aside>
  )
}

function keyedLines(text: string) {
  const seen = new Map<string, number>()
  return text.split('\n').map((line) => {
    const n = (seen.get(line) ?? 0) + 1
    seen.set(line, n)
    return { line, key: `${line}#${n}` }
  })
}
