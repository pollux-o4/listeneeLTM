import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

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
