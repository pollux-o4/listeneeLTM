import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }
import { pack } from './pack.mjs'
import { stage } from './stage.mjs'
import { releaseVersion } from './version.mjs'

async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ltm-release-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

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
  assert.equal(manifest.license, 'MIT')
  const license = await readFile(new URL('../../LICENSE', import.meta.url), 'utf8')
  assert.equal(await readFile(join(output, 'listenee-ltm/LICENSE'), 'utf8'), license)
  assert.deepEqual(
    manifest.optionalDependencies,
    Object.fromEntries(platforms.map((p) => [p.package, '0.1.0'])),
  )
  for (const platform of platforms) {
    const binaryManifest = JSON.parse(
      await readFile(join(output, platform.id, 'package.json'), 'utf8'),
    )
    assert.equal(binaryManifest.name, platform.package)
    assert.equal(binaryManifest.license, manifest.license)
    assert.equal(await readFile(join(output, platform.id, 'LICENSE'), 'utf8'), license)
    assert.match(
      await readFile(join(output, platform.id, 'THIRD_PARTY_NOTICES.txt'), 'utf8'),
      /galmuri/,
    )
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

test('release tag must match the Cargo workspace version', async () => {
  const version = await releaseVersion()
  assert.equal(await releaseVersion(`v${version}`), version)
  await assert.rejects(releaseVersion('v999.0.0'), /must match/)
})
