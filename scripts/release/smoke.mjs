import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { verifyCli, verifyTitle, verifyUiEdit, verifyUiUndo } from './smoke/checks.mjs'

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
  await verifyCli(run, project, version)
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
  await verifyUiEdit(address)
  verifyTitle(run, 'GUI API edited')
  await verifyUiUndo(address)
  verifyTitle(run, 'CLI edited')
  console.log(`Smoke passed: ${binary}`)
} finally {
  if (server) {
    server.kill()
    await closed
  }
  await rm(project, { recursive: true, force: true })
}
