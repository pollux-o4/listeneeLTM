import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Keep line breaks and literals intact so diagnostics point to the source line.
function stripComments(source) {
  let i = 0
  let result = ''
  function quoted(quote) {
    result += source[i++]
    while (i < source.length) {
      const ch = source[i++]
      result += ch
      if (ch === '\\') result += source[i++] ?? ''
      else if (ch === quote) break
      else if (quote === '`' && ch === '$' && source[i] === '{') {
        result += source[i++]
        code(true)
      }
    }
  }
  function code(interpolation = false) {
    let depth = 0
    while (i < source.length) {
      const ch = source[i]
      const next = source[i + 1]
      if (ch === '/' && (next === '/' || next === '*')) {
        const start = i
        i += 2
        if (next === '/') {
          while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i++
        } else {
          while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++
          i = Math.min(i + 2, source.length)
        }
        result += source.slice(start, i).replace(/[^\r\n]/g, ' ')
      } else if (ch === '/' && /(?:^|[=(:,[!&|?;]|\breturn|\bthrow)\s*$/.test(source.slice(0, i))) {
        // Slashes inside a regular expression are not comment delimiters.
        result += source[i++]
        let characterClass = false
        while (i < source.length) {
          const part = source[i++]
          result += part
          if (part === '\\') result += source[i++] ?? ''
          else if (part === '[') characterClass = true
          else if (part === ']') characterClass = false
          else if (part === '/' && !characterClass) break
        }
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quoted(ch)
      } else {
        result += ch
        i++
        if (ch === '{') depth++
        if (ch === '}') {
          if (interpolation && depth === 0) return
          depth--
        }
      }
    }
  }
  code()
  return result
}

// Exercise comments, JSX, URLs, and nested template expressions on every run.
assert.equal(/[가-힣]/.test(stripComments('// 주석\n{/* 주석 */}\n/* 여러\n줄 */')), false)
for (const source of [
  'const text = "https://example.com/한글" // 주석',
  '<p aria-label="한글">한글</p>',
  // biome-ignore lint/suspicious/noTemplateCurlyInString: Source fixture, not an evaluated template.
  'const text = `값 ${/* 주석 */ `한글 ${1}`}`',
  'const pattern = /[//]한글/ // 주석',
  'const text = "/* 한글 */"',
]) {
  assert.equal(/[가-힣]/.test(stripComments(source)), true)
}
assert.equal(stripComments('a /* 주석\n주석 */ b\n// 주석').split('\n').length, 3)
assert.equal(/[가-힣]/.test(stripComments('<Button value={1} />\n/* 주석 */')), false)

// Storybook 메타의 title만 허용한다. JSX title이나 일반 문자열은 예외가 아니다.
function stripStoryTitle(source) {
  const clean = stripComments(source)
  const exported = /\bexport\s+default\s+(\w+|\{)/.exec(clean)
  if (!exported) return source
  const meta =
    exported[1] === '{'
      ? exported
      : new RegExp(`\\b(?:const|let|var)\\s+${exported[1]}\\s*=\\s*\\{`).exec(clean)
  if (!meta) return source
  const start = clean.indexOf('{', meta.index)
  const tokens = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[\w$]+|[^\s]/g
  tokens.lastIndex = start
  let depth = 0
  let previous = ''
  for (let token = tokens.exec(clean); token; token = tokens.exec(clean)) {
    const value = token[0]
    if (depth === 1 && (previous === '{' || previous === ',') && value === 'title') {
      const colon = tokens.exec(clean)
      const title = tokens.exec(clean)
      if (
        colon?.[0] === ':' &&
        title &&
        /^(?:'|"|`)/.test(title[0]) &&
        !title[0].includes('$' + '{')
      )
        return (
          source.slice(0, title.index) +
          title[0].replace(/[^\r\n]/g, ' ') +
          source.slice(title.index + title[0].length)
        )
      return source
    }
    if ('{[('.includes(value)) depth++
    if ('}])'.includes(value)) depth--
    if (depth === 0) break
    previous = value
  }
  return source
}
assert.equal(
  /[가-힣]/.test(
    stripStoryTitle("const meta = { title: '설명' } satisfies Meta; export default meta"),
  ),
  false,
)
assert.equal(
  /[가-힣]/.test(
    stripStoryTitle("export default { title: '설명' }; const x = <div title='문구' />"),
  ),
  true,
)

const root = new URL('../src/', import.meta.url)
let failed = false
async function check(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const url = new URL(entry.name, directory)
    if (entry.isDirectory()) {
      if (entry.name !== 'generated') await check(new URL(`${entry.name}/`, directory))
    } else if (
      /\.tsx?$/.test(entry.name) &&
      url.href !== new URL('copy/Copy.stories.tsx', root).href &&
      (!fileURLToPath(url).includes('/src/copy/') || entry.name.endsWith('.stories.tsx'))
    ) {
      const source = await readFile(url, 'utf8')
      const lines = stripComments(
        entry.name.endsWith('.stories.tsx') ? stripStoryTitle(source) : source,
      ).split('\n')
      for (const [index, line] of lines.entries()) {
        if (/[가-힣]/.test(line)) {
          console.error(`${fileURLToPath(url)}:${index + 1}`)
          failed = true
        }
      }
    }
  }
}
await check(root)
if (failed) process.exitCode = 1
