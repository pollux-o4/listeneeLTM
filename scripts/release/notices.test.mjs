import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { generateNotices, rustCopyrightText, updateNotices } from './notices.mjs'

const license = `Copyright (c) Fixture authors
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction. This notice must be retained.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
`

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'ltm-notices-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const legal = join(root, 'docs/legal')
  const crate = join(root, 'cargo/dep')
  const js = join(root, 'node_modules/galmuri')
  const sysroot = join(root, 'sysroot')
  const rustDocs = join(sysroot, 'share/doc/rust')
  for (const directory of [legal, crate, js, join(rustDocs, 'licenses')])
    await mkdir(directory, { recursive: true })
  await writeFile(join(crate, 'LICENSE'), license)
  await writeFile(join(js, 'ofl.md'), license)
  await writeFile(join(js, 'package.json'), JSON.stringify({ name: 'galmuri', version: '1.0.0' }))
  await writeFile(join(legal, 'runtime.txt'), license)
  await writeFile(
    join(legal, 'sources.json'),
    JSON.stringify({
      rustVersion: '1.99.1',
      files: [
        {
          file: 'runtime.txt',
          component: 'Reviewed runtime',
          license: 'MIT',
          source: 'https://example.com/exact-commit/LICENSE',
          sha256: createHash('sha256').update(license).digest('hex'),
        },
      ],
    }),
  )
  await writeFile(
    join(rustDocs, 'COPYRIGHT-library.html'),
    `<h1>Copyright notices for The Rust Standard Library</h1><pre>${license.replaceAll('&', '&amp;')}</pre>`,
  )
  await writeFile(join(rustDocs, 'licenses/MIT.txt'), license)
  const cargo = {
    workspace_members: ['own'],
    packages: [
      { id: 'own', name: 'ltm-cli', version: '0.1.0', manifest_path: join(root, 'Cargo.toml') },
      {
        id: 'dep',
        name: 'dep',
        version: '1.0.0',
        license: 'MIT',
        manifest_path: join(crate, 'Cargo.toml'),
      },
    ],
  }
  const inventory = { MIT: [{ name: 'galmuri', versions: ['1.0.0'], paths: [js], license: 'MIT' }] }
  const run = (command, args, cwd) => {
    assert.equal(cwd, root)
    if (command === 'rustc' && args[0] === '--version') return 'rustc 1.99.1 (fixture)'
    if (command === 'rustc') {
      assert.deepEqual(args, ['--print', 'sysroot'])
      return sysroot
    }
    if (command === 'cargo') {
      assert.deepEqual(args, ['metadata', '--locked', '--format-version', '1'])
      return JSON.stringify(cargo)
    }
    assert.equal(command, 'pnpm')
    assert.deepEqual(args, ['licenses', 'list', '--prod', '--json'])
    return JSON.stringify(inventory)
  }
  return { root, run, legal, crate, js, cargo, inventory, rustDocs }
}

test('generation retains actual terms, excludes own crates and does not write UI types', async (t) => {
  const options = await fixture(t)
  const generated = await generateNotices(options)
  assert.match(generated, /^NO PUBLIC PROJECT LICENSE/)
  for (const component of [
    'cargo:dep@1.0.0',
    'npm:galmuri@1.0.0',
    'Rust standard library 1.99.1',
    'Reviewed runtime',
  ])
    assert.ok(generated.includes(component), component)
  assert.ok(generated.includes(license))
  assert.ok(!generated.includes('cargo:ltm-cli@'))
  assert.ok(
    !generated.includes(options.root),
    'absolute machine paths must not enter tracked output',
  )
  assert.equal(await generateNotices(options), generated)
  await assert.rejects(readFile(join(options.root, 'ui/src/generated/index.ts')), {
    code: 'ENOENT',
  })
})

test('check detects missing/stale output and never overwrites it', async (t) => {
  const options = await fixture(t)
  await assert.rejects(updateNotices({ ...options, check: true }), /notices are stale/)
  await updateNotices(options)
  await updateNotices({ ...options, check: true })
  const path = join(options.legal, 'THIRD_PARTY_NOTICES.txt')
  const original = await readFile(path, 'utf8')
  await writeFile(join(options.crate, 'LICENSE'), `${license}\nCopyright (c) Added author\n`)
  await assert.rejects(updateNotices({ ...options, check: true }), /notices are stale/)
  assert.equal(await readFile(path, 'utf8'), original)
  await updateNotices(options)
  await updateNotices({ ...options, check: true })
})

test('selecting or changing the project license requires regeneration and embeds its text', async (t) => {
  const options = await fixture(t)
  await updateNotices(options)
  const projectLicense = 'Owner-approved project terms\nCopyright (c) Project owner\n'
  await writeFile(join(options.root, 'LICENSE'), projectLicense)
  await assert.rejects(updateNotices({ ...options, check: true }), /notices are stale/)
  const generated = await generateNotices(options)
  assert.ok(generated.startsWith(`PROJECT LICENSE — listeneeLTM\n\n${projectLicense}`))
  assert.ok(!generated.includes('NO PUBLIC PROJECT LICENSE'))
  await updateNotices(options)
  await updateNotices({ ...options, check: true })
  await writeFile(join(options.root, 'LICENSE'), '')
  await assert.rejects(generateNotices(options), /Project LICENSE is empty/)
})

for (const ecosystem of ['Cargo', 'JavaScript']) {
  test(`missing or identifier-only ${ecosystem} license fails without replacing notices`, async (t) => {
    const options = await fixture(t)
    await updateNotices(options)
    const path = ecosystem === 'Cargo' ? join(options.crate, 'LICENSE') : join(options.js, 'ofl.md')
    const outputPath = join(options.legal, 'THIRD_PARTY_NOTICES.txt')
    const original = await readFile(outputPath, 'utf8')
    await rm(path)
    await assert.rejects(updateNotices(options), /Missing full license text/)
    await writeFile(path, 'MIT\n')
    await assert.rejects(updateNotices(options), /Missing full license text/)
    assert.equal(await readFile(outputPath, 'utf8'), original)
  })
}

test('reviewed fallback supplies exact-version missing crate text and rejects hash changes', async (t) => {
  const options = await fixture(t)
  await rm(join(options.crate, 'LICENSE'))
  const manifestPath = join(options.legal, 'sources.json')
  const sources = JSON.parse(await readFile(manifestPath, 'utf8'))
  sources.files[0].packages = ['cargo:dep@1.0.0']
  await writeFile(manifestPath, JSON.stringify(sources))
  assert.match(await generateNotices(options), /cargo:dep@1\.0\.0/)
  options.cargo.packages[1].version = '1.0.1'
  await assert.rejects(generateNotices(options), /Missing full license text/)
  options.cargo.packages[1].version = '1.0.0'
  await writeFile(join(options.legal, 'runtime.txt'), `${license}\nchanged`)
  await assert.rejects(generateNotices(options), /Reviewed notice hash mismatch/)
})

test('incomplete production inventory and missing Rust copyright fail closed', async (t) => {
  const options = await fixture(t)
  options.inventory.MIT[0].versions.push('2.0.0')
  await assert.rejects(generateNotices(options), /Missing installed version/)
  options.inventory.MIT[0].versions.pop()
  await rm(join(options.rustDocs, 'COPYRIGHT-library.html'))
  await assert.rejects(generateNotices(options), { code: 'ENOENT' })
})

test('Rust HTML decoding preserves literal author addresses and rejects unknown entities', () => {
  const html =
    '<h1>Copyright notices for The Rust Standard Library</h1><pre>Copyright &#169; Author &lt;author@example.com&gt; &amp; Contributors</pre>'
  assert.match(rustCopyrightText(html), /Copyright © Author <author@example\.com> & Contributors/)
  assert.throws(() => rustCopyrightText(`${html}&unexpected;`), /Unknown Rust copyright entity/)
})
