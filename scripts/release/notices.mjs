import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const noticePath = 'docs/legal/THIRD_PARTY_NOTICES.txt'
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const normalize = (text) => `${text.replaceAll('\r\n', '\n').trim()}\n`
const noticeName = /^(?:licen[cs]e|copying|copyright|notice|ofl)(?:$|[-_.])|^authors$/i

function runCommand(command, args, cwd) {
  // Only fixed pnpm arguments reach the Windows .cmd shim.
  return execFileSync(
    command === 'pnpm' && process.platform === 'win32' ? 'pnpm.cmd' : command,
    args,
    {
      cwd,
      encoding: 'utf8',
      shell: command === 'pnpm' && process.platform === 'win32',
      timeout: 120_000,
      maxBuffer: 32 * 1024 * 1024,
    },
  )
}

function requireLicenseText(files, component) {
  assert.ok(
    files.some(({ text }) =>
      /permission is hereby granted|redistribution and use|terms and conditions for (?:use|copying)|sil open font license|mozilla public license/i.test(
        text,
      ),
    ),
    `Missing full license text for ${component}; add a reviewed, version-pinned source`,
  )
  for (const file of files) assert.ok(file.text.trim(), `Empty notice: ${component}/${file.name}`)
}

async function packageNotices(directory, component, licenseFile, fallback = []) {
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && noticeName.test(entry.name))
    .map((entry) => entry.name)
  if (licenseFile) names.push(licenseFile)
  const files = await Promise.all(
    [...new Set(names)].sort(compare).map(async (name) => ({
      name,
      text: normalize(await readFile(resolve(directory, name), 'utf8')),
    })),
  )
  files.push(...fallback)
  requireLicenseText(files, component)
  return files
}

// Rust ships generated HTML, with license bodies in <pre> and a few named entities.
// Decode after removing tags so author addresses and literal <...> survive.
export function rustCopyrightText(html) {
  assert.match(html, /Copyright notices for The Rust Standard Library/)
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  const text = html
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
      if (entity.startsWith('#'))
        return String.fromCodePoint(
          entity[1].toLowerCase() === 'x'
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10),
        )
      assert.ok(Object.hasOwn(entities, entity), `Unknown Rust copyright entity: &${entity};`)
      return entities[entity]
    })
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n')
  return normalize(text)
}

function section(component, license, files) {
  return `\n${'='.repeat(72)}\n${component}\nDeclared license: ${license}\n${files
    .map(({ name, text }) => `\n--- ${name} ---\n${normalize(text)}`)
    .join('')}`
}

export async function generateNotices({ root = repository, run = runCommand } = {}) {
  const legal = resolve(root, 'docs/legal')
  const reviewed = JSON.parse(await readFile(resolve(legal, 'sources.json'), 'utf8'))
  const rustVersion = run('rustc', ['--version'], root).trim().split(/\s+/)[1]
  assert.equal(rustVersion, reviewed.rustVersion, 'Review runtime notices after a Rust upgrade')
  const pinned = new Map()
  const runtimes = []
  for (const source of reviewed.files) {
    const bytes = await readFile(resolve(legal, source.file))
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      source.sha256,
      `Reviewed notice hash mismatch: ${source.file}`,
    )
    assert.match(source.source, /^https:\/\//)
    const file = { name: `${source.file}\nSource: ${source.source}`, text: bytes.toString('utf8') }
    requireLicenseText([file], source.file)
    if (source.packages) {
      for (const id of source.packages) {
        const files = pinned.get(id) ?? []
        files.push(file)
        pinned.set(id, files)
      }
    } else {
      runtimes.push(section(source.component, source.license, [file]))
    }
  }

  const cargo = JSON.parse(run('cargo', ['metadata', '--locked', '--format-version', '1'], root))
  const own = new Set(cargo.workspace_members)
  const crates = cargo.packages.filter((pkg) => !own.has(pkg.id))
  assert.ok(crates.length, 'Cargo third-party inventory is empty')
  crates.sort((a, b) => compare(`${a.name}@${a.version}`, `${b.name}@${b.version}`))
  const sections = []
  for (const pkg of crates) {
    const id = `cargo:${pkg.name}@${pkg.version}`
    assert.ok(pkg.license || pkg.license_file, `Missing license declaration: ${id}`)
    const files = await packageNotices(
      dirname(pkg.manifest_path),
      id,
      pkg.license_file,
      pinned.get(id),
    )
    sections.push(section(id, pkg.license ?? 'See supplied license file', files))
  }

  const js = JSON.parse(run('pnpm', ['licenses', 'list', '--prod', '--json'], root))
  assert.ok(!js.error, `pnpm license inventory failed: ${JSON.stringify(js.error)}`)
  const packages = Object.values(js).flat()
  assert.ok(packages.length, 'Production JavaScript inventory is empty')
  const installed = new Map()
  for (const pkg of packages) {
    const seenVersions = new Set()
    for (const path of pkg.paths) {
      const manifest = JSON.parse(await readFile(resolve(path, 'package.json'), 'utf8'))
      assert.equal(manifest.name, pkg.name, `Installed package mismatch: ${path}`)
      assert.ok(pkg.versions.includes(manifest.version), `Installed version mismatch: ${pkg.name}`)
      assert.ok(
        pkg.license && !/^(unknown|unlicensed)$/i.test(pkg.license),
        `Missing license declaration: ${pkg.name}`,
      )
      seenVersions.add(manifest.version)
      const id = `npm:${manifest.name}@${manifest.version}`
      const files = await packageNotices(path, id)
      const content = section(id, pkg.license, files)
      assert.ok(
        !installed.has(id) || installed.get(id) === content,
        `Conflicting installed notices: ${id}`,
      )
      installed.set(id, content)
    }
    assert.deepEqual(
      [...seenVersions].sort(compare),
      [...pkg.versions].sort(compare),
      `Missing installed version: ${pkg.name}`,
    )
  }
  sections.push(...[...installed].sort(([a], [b]) => compare(a, b)).map(([, content]) => content))

  const sysroot = run('rustc', ['--print', 'sysroot'], root).trim()
  const rustDocs = resolve(sysroot, 'share/doc/rust')
  const rustFiles = [
    {
      name: 'COPYRIGHT-library.html (plain text)',
      text: rustCopyrightText(await readFile(resolve(rustDocs, 'COPYRIGHT-library.html'), 'utf8')),
    },
  ]
  const licenses = resolve(rustDocs, 'licenses')
  for (const name of (await readdir(licenses)).sort(compare)) {
    rustFiles.push({
      name: `licenses/${name}`,
      text: await readFile(resolve(licenses, name), 'utf8'),
    })
  }
  assert.ok(rustFiles.length > 1, 'Rust sysroot license texts are missing')
  requireLicenseText(rustFiles, 'Rust standard library')
  sections.push(
    section(`Rust standard library ${rustVersion}`, 'See original notices below', rustFiles),
  )
  sections.push(...runtimes)
  const projectLicense = await readFile(resolve(root, 'LICENSE'), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (projectLicense !== undefined) assert.ok(projectLicense.trim(), 'Project LICENSE is empty')
  const project =
    projectLicense === undefined
      ? 'NO PUBLIC PROJECT LICENSE — owner license choice is pending. Public distribution is blocked.\n'
      : `PROJECT LICENSE — listeneeLTM\n\n${normalize(projectLicense)}`
  return normalize(`${project}\nTHIRD-PARTY NOTICES — listeneeLTM
Generated by scripts/release/notices.mjs. Regenerate after dependency/toolchain changes.
Conservative inventory: all resolved Cargo packages, production JavaScript packages,
Rust standard-library notices and reviewed static-runtime notices. Some components
are build-only or target-specific. Original license alternatives are retained;
this document does not choose a license for listeneeLTM.
${sections.join('')}`)
}

export async function updateNotices({ root = repository, check = false, run = runCommand } = {}) {
  const generated = await generateNotices({ root, run })
  const path = resolve(root, noticePath)
  if (check) {
    const current = await readFile(path, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    assert.ok(
      current === generated,
      'Third-party notices are stale; run node scripts/release/notices.mjs',
    )
  } else {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, generated)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(
      process.argv.slice(2).every((arg) => arg === '--check'),
      'Usage: node scripts/release/notices.mjs [--check]',
    )
    await updateNotices({ check: process.argv.includes('--check') })
  } catch (error) {
    // Assertion diffs can contain the entire generated notice bundle.
    console.error(`notices: ${error.message.split('\n')[0]}`)
    process.exitCode = 1
  }
}
