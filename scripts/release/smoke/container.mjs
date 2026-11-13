import assert from 'node:assert/strict'
import { chmod, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { verifyCli, verifyTitle } from './checks.mjs'
import { mount, withDockerSmoke } from './docker.mjs'
import images from './images.json' with { type: 'json' }

const file = (relative) => fileURLToPath(new URL(relative, import.meta.url))

async function binarySmoke({ directory, image, command, run, start }, source, version) {
  const build = join(directory, 'build')
  const project = join(directory, 'project')
  await mkdir(build)
  await mkdir(project)
  await copyFile(source, join(build, 'ltm'))
  await chmod(join(build, 'ltm'), 0o755)
  await writeFile(join(build, 'Dockerfile'), 'FROM scratch\nCOPY ltm /ltm\nENTRYPOINT ["/ltm"]\n')
  command('build', '--network=none', '--pull=false', '--tag', image, build)
  const projectMount = mount(project, '/project', false)
  const cli = (...args) => run('none', ...projectMount, image, '--project', '/project', ...args)
  await verifyCli(cli, project, version)
  const target = start(
    ...projectMount,
    image,
    '--project',
    '/project',
    'ui',
    '--port',
    '0',
    '--no-open',
  )
  let address
  let log = ''
  for (let attempt = 0; attempt < 100; attempt++) {
    log = command('logs', target)
    address = log.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
    if (address) break
    assert.equal(
      command('inspect', '--format', '{{.State.Running}}', target).trim(),
      'true',
      `Scratch UI server exited: ${log}`,
    )
    await setTimeout(100)
  }
  assert.ok(address, `Scratch UI did not start: ${log}`)
  // Loopback belongs to the target namespace, including under rootless Docker.
  const probe = (phase) =>
    run(
      `container:${target}`,
      ...mount(file('./probe.mjs'), '/test/probe.mjs'),
      ...mount(file('./checks.mjs'), '/test/checks.mjs'),
      images.node,
      'node',
      '/test/probe.mjs',
      phase,
      address,
    )
  probe('edit')
  verifyTitle(cli, 'GUI API edited')
  probe('undo')
  verifyTitle(cli, 'CLI edited')
  console.log(
    'Scratch CLI, persistent init, embedded UI, API PATCH/undo and origin rejection passed',
  )
}

function npmSmoke({ run }, source, version) {
  run(
    'none',
    '--tmpfs',
    '/tmp:rw,exec,nosuid,nodev,mode=1777',
    '--env',
    'HOME=/tmp',
    ...mount(source, '/assets'),
    ...mount(file('../npm-smoke.mjs'), '/work/scripts/release/npm-smoke.mjs'),
    ...mount(
      file('../../../npm/listenee-ltm/platforms.json'),
      '/work/npm/listenee-ltm/platforms.json',
    ),
    images.node,
    'node',
    '/work/scripts/release/npm-smoke.mjs',
    '/assets',
    version,
  )
  console.log('Offline npm tarballs passed in Node-only slim (no Rust)')
}

export async function containerSmoke(mode, source, version) {
  await withDockerSmoke(async (docker) => {
    // Only preflight may access the registry. All subsequent executions are offline.
    try {
      docker.command('image', 'inspect', images.node)
    } catch {
      docker.command('pull', images.node)
    }
    const expectedNode = images.node.match(/^node:(\d+\.\d+\.\d+)-/)?.[1]
    assert.ok(expectedNode, 'Pin an explicit Node version and digest in images.json')
    assert.equal(docker.run('none', images.node, 'node', '--version').trim(), `v${expectedNode}`)
    if (mode === 'npm') npmSmoke(docker, source, version)
    else await binarySmoke(docker, source, version)
  })
}
