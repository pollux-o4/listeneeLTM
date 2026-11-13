import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Shared with native smoke so Docker exercises the same release behavior.
export async function verifyCli(run, project, version) {
  if (version) assert.equal(run('--version').trim(), `ltm ${version}`)
  const licenses = run('licenses')
  assert.match(licenses, /galmuri/)
  assert.match(licenses, /\bMIT\b/)
  run('init')
  assert.match(await readFile(join(project, '.ltm/AGENTS.md'), 'utf8'), /ltm/)
  const preserved = ['AGENTS.md', '.ltm/AGENTS.md', '.ltm/.gitignore']
  for (const path of preserved) {
    const file = join(project, path)
    await writeFile(file, `${await readFile(file, 'utf8')}\n# user content\n`)
  }
  const before = await Promise.all(preserved.map((path) => readFile(join(project, path), 'utf8')))
  run('init')
  assert.deepEqual(
    await Promise.all(preserved.map((path) => readFile(join(project, path), 'utf8'))),
    before,
  )
  const created = JSON.parse(run('new', 'release-smoke', 'Release smoke'))
  assert.equal(created.brief.id, 'release-smoke')
  run('set', 'release-smoke', JSON.stringify({ op: 'setTitle', value: 'CLI edited' }))
  assert.equal(JSON.parse(run('check', 'release-smoke')).brief.title, 'CLI edited')
  assert.match(run('export', 'release-smoke'), /CLI edited/)
}

export function verifyTitle(run, title) {
  assert.equal(JSON.parse(run('check', 'release-smoke')).brief.title, title)
  assert.ok(run('export', 'release-smoke').includes(title))
}

export async function verifyUiEdit(address) {
  const get = (path) => fetch(`${address}${path}`, { signal: AbortSignal.timeout(5000) })
  const response = await get('/')
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/html/)
  const html = await response.text()
  assert.match(html, /Listen to Me/)
  const script = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/)?.[1]
  assert.ok(script?.startsWith('/assets/'), 'Expected a built UI bundle embedded in the binary')
  const asset = await get(script)
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('content-type'), /javascript/)
  assert.ok((await asset.text()).length > 100)
  const briefs = await get('/api/briefs')
  assert.equal(briefs.status, 200)
  assert.ok((await briefs.json()).some((brief) => brief.id === 'release-smoke'))
  const path = `${address}/api/briefs/release-smoke`
  const read = await get('/api/briefs/release-smoke')
  assert.equal((await read.json()).brief.title, 'CLI edited')
  const crossOrigin = await fetch(`${path}/undo`, {
    method: 'POST',
    headers: { origin: 'http://localhost:4320' },
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(crossOrigin.status, 403)
  const edited = await fetch(path, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', origin: address },
    body: JSON.stringify({ op: 'setTitle', value: 'GUI API edited' }),
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(edited.status, 200)
  assert.equal((await edited.json()).brief.title, 'GUI API edited')
  const persisted = await get('/api/briefs/release-smoke')
  assert.equal((await persisted.json()).brief.title, 'GUI API edited')
}

export async function verifyUiUndo(address) {
  const path = `${address}/api/briefs/release-smoke`
  const undone = await fetch(`${path}/undo`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(undone.status, 200)
  assert.equal((await undone.json()).brief.title, 'CLI edited')
  const persisted = await fetch(path, { signal: AbortSignal.timeout(5000) })
  assert.equal((await persisted.json()).brief.title, 'CLI edited')
}
