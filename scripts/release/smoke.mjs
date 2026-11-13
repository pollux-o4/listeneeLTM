import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'

const [, , executable, version] = process.argv
assert.ok(executable, 'Usage: node scripts/release/smoke.mjs BINARY [VERSION]')
const binary = resolve(executable)
const project = await mkdtemp(join(tmpdir(), 'ltm-smoke-'))
let server
let closed
try {
  const run = (...args) =>
    execFileSync(binary, ['--project', project, ...args], {
      cwd: project,
      encoding: 'utf8',
      timeout: 15_000,
      maxBuffer: 8 * 1024 * 1024,
    })
  if (version) assert.equal(run('--version').trim(), `ltm ${version}`)
  assert.match(run('licenses'), /galmuri/)
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

  server = spawn(binary, ['--project', project, 'ui', '--port', '0', '--no-open'], {
    cwd: project,
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  closed = once(server, 'close')
  let log = ''
  let failure
  server.on('error', (error) => {
    failure = error
  })
  server.stderr.on('data', (chunk) => {
    log += chunk
  })
  let address
  for (let attempt = 0; attempt < 100; attempt++) {
    if (failure) throw failure
    assert.equal(server.exitCode, null, `UI server exited: ${log}`)
    address = log.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
    if (address) break
    await setTimeout(100)
  }
  assert.ok(address, `UI did not start: ${log}`)
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
  assert.equal(JSON.parse(run('check', 'release-smoke')).brief.title, 'GUI API edited')
  assert.match(run('export', 'release-smoke'), /GUI API edited/)
  const undone = await fetch(`${path}/undo`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(undone.status, 200)
  assert.equal((await undone.json()).brief.title, 'CLI edited')
  assert.equal(JSON.parse(run('check', 'release-smoke')).brief.title, 'CLI edited')
  console.log(`Smoke passed: ${binary}`)
} finally {
  if (server) {
    server.kill()
    await closed
  }
  await rm(project, { recursive: true, force: true })
}
