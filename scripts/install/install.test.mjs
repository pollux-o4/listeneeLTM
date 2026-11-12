import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

// INSTALL-001: exercise the actual installer with an isolated release transport.
for (const scenario of ['install', 'checksum mismatch', 'network failure', 'unsupported']) {
  test(`INSTALL-001 shell installer: ${scenario}`, { skip: process.platform === 'win32' }, () => {
    const root = mkdtempSync(join(tmpdir(), 'ltm-install-'))
    try {
      const mocks = join(root, 'tools')
      const release = join(root, 'release')
      const destination = join(root, 'path with spaces')
      for (const directory of [mocks, release, destination]) mkdirSync(directory)
      const payload = '#!/bin/sh\necho "ltm 0.1.0"\n'
      const digest = createHash('sha256').update(payload).digest('hex')
      writeFileSync(join(release, 'ltm-linux-x64'), payload)
      writeFileSync(
        join(release, 'SHA256SUMS'),
        `${scenario === 'checksum mismatch' ? '0'.repeat(64) : digest}  ltm-linux-x64\n`,
      )
      writeFileSync(join(destination, 'ltm'), 'existing binary')
      writeFileSync(
        join(mocks, 'uname'),
        `#!/bin/sh\ncase "$1" in -s) echo ${scenario === 'unsupported' ? 'Other' : 'Linux'};; -m) echo x86_64;; esac\n`,
        { mode: 0o755 },
      )
      writeFileSync(
        join(mocks, 'curl'),
        '#!/bin/sh\n[ "$TEST_NETWORK_FAILURE" != 1 ] || exit 22\nfor arg do\n case "$arg" in https://*) url=$arg;; esac\n target=$arg\ndone\ncp "$TEST_RELEASE_DIR/$(basename "$url")" "$target"\n',
        { mode: 0o755 },
      )
      const result = spawnSync('sh', [resolve('scripts/install/install.sh')], {
        env: {
          ...process.env,
          PATH: `${mocks}:${process.env.PATH}`,
          LTM_INSTALL_DIR: destination,
          TEST_RELEASE_DIR: release,
          TEST_NETWORK_FAILURE: scenario === 'network failure' ? '1' : '0',
        },
        encoding: 'utf8',
      })
      if (scenario === 'install') assert.equal(result.status, 0, result.stderr)
      else assert.notEqual(result.status, 0, result.stderr)
      assert.equal(
        readFileSync(join(destination, 'ltm'), 'utf8'),
        scenario === 'install' ? payload : 'existing binary',
      )
      assert.deepEqual(readdirSync(destination), ['ltm'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
}
