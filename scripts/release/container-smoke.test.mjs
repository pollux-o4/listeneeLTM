import assert from 'node:assert/strict'
import { fork, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { readdirSync } from 'node:fs'
import { constants, tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dockerClient } from './smoke/docker.mjs'

const binary = process.env.LTM_CONTAINER_BINARY
const assets = process.env.LTM_CONTAINER_ASSETS
const gnu = process.env.LTM_CONTAINER_GNU_BINARY
const version = process.env.LTM_CONTAINER_VERSION
const script = fileURLToPath(new URL('./container-smoke.mjs', import.meta.url))

function assertClean(command, id) {
  assert.equal(
    command('ps', '-aq', '--filter', `label=ltm.container-smoke=${id}`).trim(),
    '',
    'Smoke must remove its containers, including the UI server',
  )
  assert.throws(
    () => command('image', 'inspect', `${id}:test`),
    /No such image/,
    'Smoke must remove its scratch image',
  )
  assert.deepEqual(
    readdirSync(tmpdir()).filter((name) => name.startsWith(`${id}-`)),
    [],
    'Smoke must remove its temporary project and build context',
  )
}

// Opt in with actual release artifacts; ordinary distribution tests need no Docker daemon.
function smoke(mode, source, expectedVersion) {
  const { command } = dockerClient()
  const result = spawnSync(process.execPath, [script, mode, source, expectedVersion], {
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  })
  assert.ifError(result.error)
  const id = result.stdout.match(/Container smoke: (ltm-container-smoke-[\da-f-]+)/)?.[1]
  assert.ok(id, result.stderr)
  assertClean(command, id)
  return result
}

async function lifecycle(t, signal) {
  const { command } = dockerClient()
  const child = fork(
    fileURLToPath(new URL('./smoke/fixtures/lifecycle.mjs', import.meta.url)),
    [resolve(binary), signal ? 'wait' : 'throw'],
    { silent: true },
  )
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => {
    stdout += chunk
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  const closed = once(child, 'close')
  // Test-runner cancellation must still let the fixture perform its own cleanup.
  const cancel = () => child.kill('SIGTERM')
  t.signal.addEventListener('abort', cancel)
  try {
    const [ready] = await Promise.race([
      once(child, 'message'),
      closed.then(() => {
        throw new Error(`Fixture exited before UI startup: ${stderr}`)
      }),
    ])
    assert.match(ready.address, /^http:\/\/127\.0\.0\.1:\d+$/)
    if (signal) {
      assert.equal(
        command('inspect', '--format', '{{.State.Running}}', ready.target).trim(),
        'true',
      )
      assert.equal(child.kill(signal), true)
    }
    const [code, exitSignal] = await closed
    const id = stdout.match(/Container smoke: (ltm-container-smoke-[\da-f-]+)/)?.[1]
    assert.ok(id, stderr)
    assertClean(command, id)
    assert.equal(exitSignal, null, 'Fixture should exit after cleanup, without being killed')
    assert.equal(code, signal ? 128 + constants.signals[signal] : 1, stderr)
    if (!signal) assert.match(stderr, /Fixture failure after UI startup/)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      await closed
    }
    t.signal.removeEventListener('abort', cancel)
  }
}

test('real musl executable passes scratch CLI and namespace-local UI checks and cleans up', {
  skip: !(binary && version) && 'Set LTM_CONTAINER_BINARY and LTM_CONTAINER_VERSION',
}, () => {
  const result = smoke('binary', binary, version)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Scratch CLI.*API PATCH\/undo and origin rejection passed/)
})

test('a wrong expected version fails the real CLI assertion and still cleans up', {
  skip: !(binary && version) && 'Set LTM_CONTAINER_BINARY and LTM_CONTAINER_VERSION',
}, () => {
  const result = smoke('binary', binary, `${version}-incorrect`)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /ERR_ASSERTION/)
})

test(
  'failure after UI startup removes server, image and temporary project',
  {
    skip: !binary && 'Set LTM_CONTAINER_BINARY',
    timeout: 60_000,
  },
  async (t) => lifecycle(t),
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(
    `${signal} after UI startup removes server, image and temporary project`,
    {
      skip: !binary && 'Set LTM_CONTAINER_BINARY',
      timeout: 60_000,
    },
    async (t) => lifecycle(t, signal),
  )
}

test('GNU executable cannot pass scratch without its dynamic loader and still cleans up', {
  skip: !(gnu && version) && 'Set LTM_CONTAINER_GNU_BINARY and LTM_CONTAINER_VERSION',
}, () => {
  const result = smoke('binary', gnu, version)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /exec \/ltm: no such file or directory/)
})

test('local packed npm launcher runs offline in Node slim without Rust and cleans up', {
  skip: !(assets && version) && 'Set LTM_CONTAINER_ASSETS and LTM_CONTAINER_VERSION',
}, () => {
  const result = smoke('npm', assets, version)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Offline npm tarballs passed/)
})
