import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { containerSmoke } from './smoke/container.mjs'

const [, , mode, input, version] = process.argv
assert.ok(
  ['binary', 'npm'].includes(mode) && input && version && process.argv.length === 5,
  'Usage: node scripts/release/container-smoke.mjs binary BINARY VERSION | npm ASSETS VERSION',
)
const source = resolve(input)
assert.equal(
  (await stat(source)).isDirectory(),
  mode === 'npm',
  'Expected BINARY file or ASSETS dir',
)
await containerSmoke(mode, source, version)
