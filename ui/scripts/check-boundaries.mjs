// UI 모듈 경계 검사. 아래 규칙 표가 경계의 원본이다(tech-spec "구조"는 이 표를 요약한다).
// 모듈 = ui/src 바로 아래 폴더(features는 기능 하나가 모듈 하나). 위반이 있으면 파일:줄과 함께 실패한다.
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

/** 모듈이 의존해도 되는 모듈. 나열되지 않은 의존은 금지. */
const ALLOWED = {
  generated: [],
  api: ['generated'],
  copy: ['generated'],
  design: ['generated', 'copy'],
  feature: ['generated', 'copy', 'design'],
  app: ['generated', 'copy', 'design', 'api', 'feature'],
}
/** 밖에서 들어올 때 거쳐야 하는 공개 입구(모듈 내부 구조를 숨긴다). */
const ENTRY = { design: 'design/index.ts', copy: 'copy/index.ts' }

const moduleOf = (file) => {
  const parts = relative(src, file).split(sep)
  if (parts.length === 1) return { name: 'root' } // story-support 등 개발 지원 파일
  if (parts[0] === 'features') return { name: 'feature', id: `features/${parts[1]}` }
  return { name: parts[0], id: parts[0] }
}

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path
  }
}

const violations = []
for await (const file of files(src)) {
  const from = moduleOf(file)
  if (from.name === 'root' || from.name === 'generated') continue
  const story = /\.stories\.tsx$/.test(file)
  const lines = (await readFile(file, 'utf8')).split('\n')
  lines.forEach((line, i) => {
    const spec = line.match(/^\s*(?:import|export)\b.*?from\s+'(\.[^']+)'/)?.[1]
    if (!spec) return
    const target = resolve(dirname(file), spec)
    if (!target.startsWith(src)) return
    const to = moduleOf(target)
    if (to.id === from.id) return
    // 스토리는 개발 지원(story-support)과 자기 모듈의 고정 데이터를 쓸 수 있다.
    if (story && to.name === 'root') return
    const where = `${relative(resolve(src, '..'), file)}:${i + 1}`
    if (to.name === 'root') violations.push(`${where} 제품 코드가 개발 지원 파일을 가져옴`)
    else if (!ALLOWED[from.name]?.includes(to.name))
      violations.push(`${where} ${from.id} → ${to.id ?? to.name} 의존 금지`)
    else if (ENTRY[to.name] && relative(src, target) !== ENTRY[to.name].replace(/\.ts$/, '.ts'))
      violations.push(`${where} ${to.name}는 ${ENTRY[to.name]}로만 가져온다`)
  })
}

if (violations.length) {
  console.error(`모듈 경계 위반 ${violations.length}건:\n${violations.join('\n')}`)
  process.exit(1)
}
console.log('Module boundaries passed.')
