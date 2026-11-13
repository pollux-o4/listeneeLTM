import assert from 'node:assert/strict'
import { chmod, copyFile, cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }
import { releaseVersion } from './version.mjs'

const source = new URL('../../npm/listenee-ltm/', import.meta.url)
const template = JSON.parse(await readFile(new URL('package.json', source), 'utf8'))

export async function stage(version, binariesDir, outputDir) {
  assert.match(version, /^\d+\.\d+\.\d+$/)
  // Validate all inputs before writing any package.
  for (const platform of platforms) {
    assert.ok((await stat(resolve(binariesDir, platform.asset))).size > 0, platform.asset)
  }
  const notices = new URL('../../docs/legal/THIRD_PARTY_NOTICES.txt', import.meta.url)
  const license = new URL('../../LICENSE', import.meta.url)
  assert.ok((await stat(notices)).size > 0, 'Generate third-party notices before staging')
  if (template.license) assert.ok((await stat(license)).size > 0, 'Project LICENSE is required')
  const copyNotices = async (directory) => {
    await copyFile(notices, resolve(directory, 'THIRD_PARTY_NOTICES.txt'))
    if (template.license) await copyFile(license, resolve(directory, 'LICENSE'))
  }
  await mkdir(outputDir, { recursive: true })
  const launcherDir = resolve(outputDir, template.name)
  await cp(source, launcherDir, { recursive: true, errorOnExist: true, force: false })
  await copyNotices(launcherDir)
  const launcher = {
    ...template,
    version,
    optionalDependencies: Object.fromEntries(platforms.map((entry) => [entry.package, version])),
  }
  await writeFile(resolve(launcherDir, 'package.json'), `${JSON.stringify(launcher, null, 2)}\n`)
  await chmod(resolve(launcherDir, 'bin/ltm.cjs'), 0o755)
  for (const platform of platforms) {
    const directory = resolve(outputDir, platform.id)
    await mkdir(resolve(directory, 'bin'), { recursive: true })
    const binary = resolve(directory, 'bin', platform.binary)
    await copyFile(resolve(binariesDir, platform.asset), binary)
    await chmod(binary, 0o755)
    const manifest = {
      name: platform.package,
      version,
      description: `${template.name} binary for ${platform.id}`,
      os: [platform.os],
      cpu: [platform.arch],
      files: [`bin/${platform.binary}`, 'LICENSE', 'THIRD_PARTY_NOTICES.txt'],
      license: template.license,
      repository: template.repository,
      publishConfig: template.publishConfig,
    }
    await writeFile(resolve(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    await copyFile(new URL('README.md', source), resolve(directory, 'README.md'))
    await copyNotices(directory)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , binariesDir, outputDir, tag] = process.argv
  assert.ok(
    binariesDir && outputDir,
    'Usage: node scripts/release/stage.mjs BINARIES OUTPUT [vTAG]',
  )
  await stage(await releaseVersion(tag), binariesDir, outputDir)
}
