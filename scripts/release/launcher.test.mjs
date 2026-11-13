import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { cp, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import launcher from '../../npm/listenee-ltm/bin/ltm.cjs'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }

const launcherPath = fileURLToPath(new URL('../../npm/listenee-ltm/bin/ltm.cjs', import.meta.url))

async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ltm-launcher-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

test('platform selection is explicit and rejects unsupported OS/architectures', () => {
  for (const platform of platforms) {
    assert.equal(launcher.selectPlatform(platform.os, platform.arch).package, platform.package)
  }
  for (const [os, arch] of [
    ['linux', 'arm64'],
    ['darwin', 'x64'],
    ['win32', 'arm64'],
    ['freebsd', 'x64'],
  ]) {
    assert.throws(() => launcher.selectPlatform(os, arch), /Unsupported platform/)
  }
  assert.throws(
    () => launcher.resolveBinary({ package: '@listenee-ltm/missing', binary: 'ltm' }),
    /optional dependencies/,
  )
})

test('launcher preserves argument boundaries, stdout/stderr and exit code', () => {
  const args = ['with spaces', '"quotes"', '$HOME; exit 99', '한글']
  const script = `require(${JSON.stringify(launcherPath)}).launch(process.execPath, ${JSON.stringify(
    [
      '-e',
      'console.log(JSON.stringify(process.argv.slice(1))); console.error("stderr"); process.exitCode = 23',
      '--',
      ...args,
    ],
  )})`
  assert.throws(
    () => execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', stdio: 'pipe' }),
    (error) => {
      assert.equal(error.status, 23)
      assert.deepEqual(JSON.parse(error.stdout), args)
      assert.equal(error.stderr.trim(), 'stderr')
      return true
    },
  )
})

test('launcher forwards termination signals and preserves signal exit', {
  skip: process.platform === 'win32',
  timeout: 10_000,
}, async (t) => {
  const script = `require(${JSON.stringify(launcherPath)}).launch(process.execPath, ['-e', 'process.on("SIGTERM", () => { console.log("forwarded"); process.exit(0) }); console.log("ready"); setInterval(() => {}, 1000)'])`
  const child = spawn(process.execPath, ['-e', script], { stdio: ['ignore', 'pipe', 'pipe'] })
  t.after(() => child.kill('SIGKILL'))
  const done = once(child, 'close')
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  await once(child.stdout, 'data')
  child.kill('SIGTERM')
  assert.deepEqual(await done, [0, null])
  assert.match(output, /forwarded/)
  const signaled = spawn(process.execPath, [
    '-e',
    `require(${JSON.stringify(launcherPath)}).launch(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")'])`,
  ])
  assert.deepEqual(await once(signaled, 'close'), [null, 'SIGTERM'])
})

test('missing executable fails with a clear error', (t) => {
  const result = spawn(
    process.execPath,
    ['-e', `require(${JSON.stringify(launcherPath)}).launch('/nonexistent/ltm')`],
    { stdio: 'pipe' },
  )
  t.after(() => result.kill())
  return once(result, 'close').then(([code]) => assert.equal(code, 1))
})

test('installed launcher resolves a binary without lifecycle scripts', async (t) => {
  const root = await workspace(t)
  const packageDir = join(root, 'package')
  const directory = process.platform === 'win32' ? packageDir : join(root, 'alias')
  await cp(new URL('../../npm/listenee-ltm/', import.meta.url), packageDir, { recursive: true })
  if (directory !== packageDir) await symlink(packageDir, directory, 'dir')
  const platform = launcher.selectPlatform()
  const binDir = join(directory, 'node_modules', platform.package, 'bin')
  await mkdir(binDir, { recursive: true })
  await writeFile(join(binDir, platform.binary), 'fixture')
  const module = join(directory, 'bin/ltm.cjs')
  assert.equal(
    await realpath(
      execFileSync(
        process.execPath,
        ['-e', `console.log(require(${JSON.stringify(module)}).resolveBinary())`],
        { encoding: 'utf8' },
      ).trim(),
    ),
    await realpath(join(binDir, platform.binary)),
  )
})
