import { LOCALES } from '../messages.ts'
import { screenExemptions } from '../screens.exempt.ts'
import { examples, type Row, screens, storyHref, storyName, suspicious } from './model.ts'

export function CatalogRow({ row, group }: { row: Row; group: string }) {
  const ids = screens[row.key] ?? []
  const first = ids[0]
  return (
    <tr
      data-link={Boolean(first)}
      onClick={(event) => {
        if (!first || window.getSelection()?.toString()) return
        if ((event.target as HTMLElement).closest('a, details')) return
        window.top?.location.assign(storyHref(first))
      }}
    >
      <th scope="row">
        <code>{row.key.split('.').slice(2).join('.') || group}</code>
        {row.dynamic && <span className="cc-tag">값 포함</span>}
        {first ? (
          ids.length > 1 ? (
            <details className="cc-screens">
              <summary>화면 {ids.length}개</summary>
              {ids.map((id) => (
                <a key={id} className="cc-screen" href={storyHref(id)} target="_top">
                  {storyName(id)}
                </a>
              ))}
            </details>
          ) : (
            <a className="cc-screen" href={storyHref(first)} target="_top">
              {storyName(first)} →
            </a>
          )
        ) : (
          <span className="cc-note">화면 없음({screenExemptions[row.key]})</span>
        )}
      </th>
      {LOCALES.map((locale) => (
        <td key={locale} lang={locale} data-warn={suspicious(row, locale)}>
          {row.dynamic ? renderExamples(row.key, locale) : (row.text[locale] ?? '— 없음')}
        </td>
      ))}
    </tr>
  )
}

function renderExamples(key: string, locale: (typeof LOCALES)[number]) {
  const values = examples[key]
  if (!values?.length) return '예시 없음'
  return values.map((example) => (
    <div className="cc-example" key={JSON.stringify([example.story, example.args])}>
      {example.text[locale] ?? '— 없음'}
      <a
        className="cc-screen"
        href={storyHref(example.story)}
        target="_top"
        title={JSON.stringify(example.args[locale])}
      >
        {storyName(example.story)} →
      </a>
    </div>
  ))
}
