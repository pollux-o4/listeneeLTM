import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }

export async function pack(stagedDir, outputDir) {
  await mkdir(outputDir, { recursive: true })
  const packages = [
    ...platforms.map((entry) => [entry.id, ['README.md', 'package.json', `bin/${entry.binary}`]]),
    ['listenee-ltm', ['README.md', 'package.json', 'platforms.json', 'bin/ltm.cjs']],
  ]
  const tarballs = []
  for (const [directory, expected] of packages) {
    const cwd = resolve(stagedDir, directory)
    const manifest = JSON.parse(await readFile(resolve(cwd, 'package.json'), 'utf8'))
    expected.push('THIRD_PARTY_NOTICES.txt')
    if (manifest.license) expected.push('LICENSE')
    assert.equal(manifest.scripts, undefined, 'Packages must not need lifecycle scripts')
    for (const path of expected) assert.ok((await stat(resolve(cwd, path))).size > 0, path)
    // npm's JS entry point avoids invoking a shell or a .cmd shim on Windows.
    const npmCli = process.env.npm_execpath?.includes('npm-cli.js')
      ? process.env.npm_execpath
      : process.platform === 'win32'
        ? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
        : undefined
    const command = npmCli ? process.execPath : 'npm'
    const prefix = npmCli ? [npmCli] : []
    const result = JSON.parse(
      execFileSync(
        command,
        [...prefix, 'pack', '--ignore-scripts', '--json', '--pack-destination', resolve(outputDir)],
        {
          cwd,
          encoding: 'utf8',
          timeout: 15_000,
          env: {
            ...process.env,
            npm_config_cache: resolve(outputDir, '.cache'),
            npm_config_offline: 'true',
            npm_config_update_notifier: 'false',
          },
        },
      ),
    )[0]
    assert.deepEqual(result.files.map((file) => file.path).sort(), expected.sort())
    for (const file of result.files.filter((entry) => entry.path.startsWith('bin/'))) {
      assert.ok(file.size > 0, file.path)
      if (process.platform !== 'win32')
        assert.ok(file.mode & 0o111, `${file.path} must be executable`)
    }
    tarballs.push(resolve(outputDir, result.filename))
  }
  return tarballs
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , stagedDir, outputDir] = process.argv
  assert.ok(stagedDir && outputDir, 'Usage: node scripts/release/pack.mjs STAGED OUTPUT')
  console.log((await pack(stagedDir, outputDir)).join('\n'))
}
