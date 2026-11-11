import { LOCALES } from '../messages.ts'
import { CatalogRow } from './CatalogRow.tsx'
import {
  type Area,
  groupBy,
  groupScreen,
  localeNames,
  type Row,
  storyHref,
  storyName,
} from './model.ts'

export function CatalogArea({ area, visible }: { area: Area; visible: (row: Row) => boolean }) {
  const shown = area.rows.filter(visible)
  if (shown.length === 0) return null
  const groups = groupBy(shown, (row) => row.key.split('.')[1] ?? '')

  return (
    <section id={`cc-${area.key}`} className="cc-area">
      <h2 className="cc-area-title">
        {area.title} <code>{area.key}</code>
      </h2>
      {area.note && <p className="cc-note">{area.note}</p>}
      {[...groups].map(([group, rows]) => {
        const screen = groupScreen(
          area.rows.filter((row) => row.key.split('.')[1] === group).map((row) => row.key),
        )
        return (
          <div key={group} className="cc-group">
            <h3 className="cc-group-title">
              {group}
              {screen && (
                <a className="cc-screen" href={storyHref(screen)} target="_top">
                  화면 보기 · {storyName(screen)} →
                </a>
              )}
            </h3>
            <table className="cc-table">
              <thead>
                <tr>
                  <th scope="col">키</th>
                  {LOCALES.map((locale) => (
                    <th key={locale} scope="col" lang={locale}>
                      {localeNames[locale]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <CatalogRow key={row.key} row={row} group={group} />
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}
