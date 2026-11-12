import assert from 'node:assert/strict'
import { chmod, copyFile, cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }

const source = new URL('../../npm/listenee-ltm/', import.meta.url)
const template = JSON.parse(await readFile(new URL('package.json', source), 'utf8'))

export async function releaseVersion(tag) {
  const cargo = await readFile(new URL('../../Cargo.toml', import.meta.url), 'utf8')
  const section = cargo.split('[workspace.package]')[1]?.split(/^\[/m)[0]
  const version = section?.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
  assert.match(version ?? '', /^\d+\.\d+\.\d+$/, 'Expected a stable Cargo workspace version')
  if (tag) assert.equal(tag, `v${version}`, 'Release tag must match Cargo workspace version')
  const shell = await readFile(new URL('../install/install.sh', import.meta.url), 'utf8')
  const powershell = await readFile(new URL('../install/install.ps1', import.meta.url), 'utf8')
  assert.equal(
    shell.match(/^version=\$\{LTM_VERSION:-([^}]+)\}/m)?.[1],
    version,
    'install.sh default version must match Cargo',
  )
  assert.equal(
    powershell.match(/\[string\]\$Version\s*=\s*'([^']+)'/)?.[1],
    version,
    'install.ps1 default version must match Cargo',
  )
  return version
}

export async function stage(version, binariesDir, outputDir) {
  assert.match(version, /^\d+\.\d+\.\d+$/)
  // Validate all inputs before writing any package.
  for (const platform of platforms) {
    assert.ok((await stat(resolve(binariesDir, platform.asset))).size > 0, platform.asset)
  }
  await mkdir(outputDir, { recursive: true })
  const launcherDir = resolve(outputDir, template.name)
  await cp(source, launcherDir, { recursive: true, errorOnExist: true, force: false })
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
      files: [`bin/${platform.binary}`],
      repository: template.repository,
      publishConfig: template.publishConfig,
    }
    await writeFile(resolve(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    await copyFile(new URL('README.md', source), resolve(directory, 'README.md'))
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
