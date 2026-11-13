import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import platforms from '../../npm/listenee-ltm/platforms.json' with { type: 'json' }

// The release packaging job runs on Ubuntu and installs the actual packed Linux executable.
assert.equal(process.platform, 'linux', 'Run npm package smoke on the Linux packaging runner')
const [, , assets, version] = process.argv
assert.ok(assets && version, 'Usage: node scripts/release/npm-smoke.mjs ASSETS VERSION')
const platform = platforms.find(
  (entry) => entry.os === process.platform && entry.arch === process.arch,
)
assert.ok(platform, 'Unsupported packaging runner')
const project = await mkdtemp(join(tmpdir(), 'ltm-npm-smoke-'))
try {
  execFileSync(
    'npm',
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--prefix',
      project,
      resolve(assets, `listenee-ltm-${platform.id}-${version}.tgz`),
      resolve(assets, `listenee-ltm-${version}.tgz`),
    ],
    {
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env, npm_config_cache: join(project, '.cache') },
    },
  )
  const launcher = join(project, 'node_modules/listenee-ltm/bin/ltm.cjs')
  const run = (...args) =>
    execFileSync(process.execPath, [launcher, ...args], {
      cwd: project,
      encoding: 'utf8',
      timeout: 15_000,
      maxBuffer: 8 * 1024 * 1024,
    })
  assert.equal(run('--version').trim(), `ltm ${version}`)
  assert.match(run('licenses'), /galmuri/)
  run('init')
  assert.match(await readFile(join(project, '.ltm/AGENTS.md'), 'utf8'), /ltm/)
  assert.equal(JSON.parse(run('new', 'npm-smoke', 'npm smoke')).brief.id, 'npm-smoke')
  console.log('Packed npm installation and launcher smoke passed')
} finally {
  await rm(project, { recursive: true, force: true })
}
