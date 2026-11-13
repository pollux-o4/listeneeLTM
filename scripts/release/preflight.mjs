import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Public publishing requires an explicit project license and bundled third-party notices. */
export async function publicationPreflight(
  root = fileURLToPath(new URL('../../', import.meta.url)),
) {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'npm/listenee-ltm/package.json'), 'utf8'),
  )
  assert.ok(
    typeof manifest.license === 'string' &&
      manifest.license.trim() &&
      !/^unlicen[cs]ed$/i.test(manifest.license.trim()),
    'Choose the project license and set npm/listenee-ltm/package.json license before publishing',
  )
  const license = (await readFile(resolve(root, 'LICENSE'), 'utf8')).replaceAll('\r\n', '\n')
  assert.ok(license.trim().length > 100, 'LICENSE must contain the full project license text')
  const notices = await readFile(resolve(root, 'docs/legal/THIRD_PARTY_NOTICES.txt'), 'utf8')
  assert.ok(
    notices.includes(license.trim()),
    'Regenerate notices after selecting the project license',
  )
  assert.ok(
    notices.includes('galmuri') && notices.length > 1000,
    'Generate full third-party notices',
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await publicationPreflight()
  console.log('Public release preflight passed')
}
