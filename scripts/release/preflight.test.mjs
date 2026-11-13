import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { publicationPreflight } from './preflight.mjs'

test('public release rejects absent licensing and missing notice artifacts', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'ltm-preflight-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'npm/listenee-ltm'), { recursive: true })
  await mkdir(join(root, 'docs/legal'), { recursive: true })
  const manifest = join(root, 'npm/listenee-ltm/package.json')
  for (const license of [undefined, 'UNLICENSED', 'unlicensed']) {
    await writeFile(manifest, JSON.stringify({ license }))
    await assert.rejects(publicationPreflight(root), /Choose the project license/)
  }
  await writeFile(manifest, JSON.stringify({ license: 'MIT' }))
  await assert.rejects(publicationPreflight(root), /ENOENT/)
  const licenseText = 'fixture license text '.repeat(10)
  await writeFile(join(root, 'LICENSE'), licenseText)
  await assert.rejects(publicationPreflight(root), /ENOENT/)
  await writeFile(
    join(root, 'docs/legal/THIRD_PARTY_NOTICES.txt'),
    `${licenseText}\n${'galmuri notice fixture\n'.repeat(100)}`,
  )
  await publicationPreflight(root)
})
