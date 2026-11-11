import { useMemo, useState } from 'react'
import { LOCALES } from '../messages.ts'
import { CatalogArea } from './CatalogArea.tsx'
import { catalogAreas, type Row, suspicious } from './model.ts'
import './catalog.css'

export function Catalog() {
  const [query, setQuery] = useState('')
  const [onlyIssues, setOnlyIssues] = useState(false)
  const areas = useMemo(catalogAreas, [])
  const q = query.trim().toLowerCase()
  const visible = (row: Row) =>
    (!onlyIssues || LOCALES.some((locale) => suspicious(row, locale))) &&
    (!q ||
      row.key.toLowerCase().includes(q) ||
      Object.values(row.text).some((text) => text?.toLowerCase().includes(q)))
  const allRows = areas.flatMap((area) => area.rows)
  const issues = allRows.filter((row) => LOCALES.some((locale) => suspicious(row, locale))).length

  return (
    <div className="cc" style={{ ['--cc-cols' as string]: LOCALES.length }}>
      <header className="cc-head">
        <div>
          <h1 className="cc-title">사용자 노출 문구</h1>
          <p className="cc-sub">
            원본 <code>ui/src/copy/&lt;언어&gt;/</code> · 키 {allRows.length}개 · 언어{' '}
            {LOCALES.length}개 · 확인 필요 <strong data-warn={issues > 0}>{issues}</strong>
          </p>
        </div>
        <div className="cc-tools">
          <label className="cc-check">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(event) => setOnlyIssues(event.target.checked)}
            />
            확인 필요만
          </label>
          <input
            className="cc-search"
            type="search"
            placeholder="문구나 키로 찾기"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </header>
      <div className="cc-body">
        <nav className="cc-toc" aria-label="영역">
          {areas.map((area) => (
            <a key={area.key} href={`#cc-${area.key}`}>
              <span>{area.title}</span>
              <span className="cc-count">{area.rows.filter(visible).length}</span>
            </a>
          ))}
        </nav>
        <div className="cc-areas">
          {areas.map((area) => (
            <CatalogArea key={area.key} area={area} visible={visible} />
          ))}
        </div>
      </div>
    </div>
  )
}
