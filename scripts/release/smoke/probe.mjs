import assert from 'node:assert/strict'
import { verifyUiEdit, verifyUiUndo } from './checks.mjs'

const [, , phase, address] = process.argv
assert.ok(['edit', 'undo'].includes(phase), 'Expected edit or undo')
assert.match(address, /^http:\/\/127\.0\.0\.1:\d+$/)
await (phase === 'edit' ? verifyUiEdit(address) : verifyUiUndo(address))
console.log(`Container UI ${phase} passed`)
