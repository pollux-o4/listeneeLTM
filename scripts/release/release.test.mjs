import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import launcher from '../../npm/listenee-ltm/bin/ltm.cjs'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }
import { pack } from './pack.mjs'
import { releaseVersion, stage } from './stage.mjs'

const launcherPath = fileURLToPath(new URL('../../npm/listenee-ltm/bin/ltm.cjs', import.meta.url))

async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ltm-pack-test-'))
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

test('stage and npm pack contain all four packages and reject missing binaries', {
  timeout: 60_000,
}, async (t) => {
  const directory = await workspace(t)
  const input = join(directory, 'binaries')
  const output = join(directory, 'packages')
  await mkdir(input)
  await assert.rejects(stage('0.1.0', input, output), /ENOENT/)
  for (const platform of platforms)
    await writeFile(join(input, platform.asset), `fixture:${platform.id}`)
  await stage('0.1.0', input, output)
  const manifest = JSON.parse(await readFile(join(output, 'listenee-ltm/package.json'), 'utf8'))
  assert.equal(manifest.version, '0.1.0')
  assert.deepEqual(
    manifest.optionalDependencies,
    Object.fromEntries(platforms.map((p) => [p.package, '0.1.0'])),
  )
  for (const platform of platforms) {
    const binaryManifest = JSON.parse(
      await readFile(join(output, platform.id, 'package.json'), 'utf8'),
    )
    assert.equal(binaryManifest.name, platform.package)
    assert.deepEqual(binaryManifest.os, [platform.os])
    assert.deepEqual(binaryManifest.cpu, [platform.arch])
    assert.equal(
      await readFile(join(output, platform.id, 'bin', platform.binary), 'utf8'),
      `fixture:${platform.id}`,
    )
  }
  const tarballs = await pack(output, join(directory, 'tarballs'))
  assert.equal(tarballs.length, 4)
  for (const tarball of tarballs) assert.ok((await readFile(tarball)).length > 0)
  const platformManifestPath = join(output, platforms[0].id, 'package.json')
  const platformManifest = JSON.parse(await readFile(platformManifestPath, 'utf8'))
  await writeFile(platformManifestPath, JSON.stringify({ ...platformManifest, files: [] }))
  await assert.rejects(pack(output, join(directory, 'omitted')), { code: 'ERR_ASSERTION' })
  await writeFile(platformManifestPath, JSON.stringify(platformManifest))
  await rm(join(output, platforms[0].id, 'bin', platforms[0].binary))
  await assert.rejects(pack(output, join(directory, 'broken')), /ENOENT/)
})

test('installed launcher resolves a binary without lifecycle scripts', async (t) => {
  const directory = await workspace(t)
  await cp(new URL('../../npm/listenee-ltm/', import.meta.url), directory, { recursive: true })
  const platform = launcher.selectPlatform()
  const binDir = join(directory, 'node_modules', platform.package, 'bin')
  await mkdir(binDir, { recursive: true })
  await writeFile(join(binDir, platform.binary), 'fixture')
  const module = join(directory, 'bin/ltm.cjs')
  assert.equal(
    execFileSync(
      process.execPath,
      ['-e', `console.log(require(${JSON.stringify(module)}).resolveBinary())`],
      { encoding: 'utf8' },
    ).trim(),
    join(binDir, platform.binary),
  )
})

test('release tag must match the Cargo workspace version', async () => {
  const version = await releaseVersion()
  assert.equal(await releaseVersion(`v${version}`), version)
  await assert.rejects(releaseVersion('v999.0.0'), /must match/)
})
