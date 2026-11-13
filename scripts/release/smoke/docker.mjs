import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { constants, tmpdir } from 'node:os'
import { join } from 'node:path'

export function dockerClient() {
  // Bootstrap once; every subsequent call stays pinned if the default context changes.
  const context = execFileSync('docker', ['context', 'show'], { encoding: 'utf8' }).trim()
  assert.ok(context, 'Docker has no current context')
  const command = (...args) => {
    const result = spawnSync('docker', ['--context', context, ...args], {
      encoding: 'utf8',
      timeout: 120_000,
      // Embedded notices exceed 3 MiB.
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.error) throw result.error
    if (result.status !== 0)
      throw Object.assign(new Error(`docker ${args[0]} failed: ${result.stderr}`), result)
    return args[0] === 'logs' ? result.stdout + result.stderr : result.stdout
  }
  const endpoint = command(
    'context',
    'inspect',
    context,
    '--format',
    '{{.Endpoints.docker.Host}}',
  ).trim()
  assert.ok(
    endpoint.startsWith('unix://'),
    'Docker smoke bind mounts require a local Unix-socket context',
  )
  return { context, command }
}

export const mount = (source, target, readonly = true) => [
  '--mount',
  `type=bind,source=${source},target=${target}${readonly ? ',readonly' : ''}`,
]

export async function withDockerSmoke(scenario) {
  const { context, command } = dockerClient()
  const security = JSON.parse(command('info', '--format', '{{json .SecurityOptions}}')) ?? []
  const rootless = security.includes('name=rootless')
  const user = rootless ? '0:0' : `${process.getuid()}:${process.getgid()}`
  const id = `ltm-container-smoke-${randomUUID()}`
  const image = `${id}:test`
  let directory
  let signalExitCode
  let interrupted
  const cancellation = new Promise((resolve) => {
    interrupted = resolve
  })
  const onSignal = (signal) => {
    signalExitCode ??= 128 + constants.signals[signal]
    interrupted()
  }
  const signalHandlers = new Map(
    ['SIGINT', 'SIGTERM'].map((signal) => [signal, () => onSignal(signal)]),
  )
  const execute = (...args) => {
    assert.equal(signalExitCode, undefined, 'Docker smoke was interrupted')
    return command(...args)
  }
  const containers = []
  const containerArgs = (network) => {
    const name = `${id}-${containers.length}`
    containers.push(name)
    return [
      '--name',
      name,
      '--label',
      `ltm.container-smoke=${id}`,
      '--pull=never',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--user',
      user,
      '--network',
      network,
    ]
  }
  const run = (network, ...args) => execute('run', '--rm', ...containerArgs(network), ...args)
  const start = (...args) => {
    const options = containerArgs('none')
    execute('run', '--detach', ...options, ...args)
    return options[1]
  }
  const failures = []
  let cleanupPromise
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      // Only UUID-scoped resources; never prune images, volumes, or build cache.
      if (containers.length) {
        try {
          command('rm', '--force', ...containers)
        } catch {
          // --rm removes completed runs; a partial rm must still remove the live server.
          try {
            assert.equal(
              command('ps', '-aq', '--filter', `label=ltm.container-smoke=${id}`).trim(),
              '',
            )
          } catch (error) {
            failures.push(error)
          }
        }
      }
      try {
        command('image', 'rm', '--force', image)
      } catch (error) {
        // npm mode and failed builds may never create this image.
        if (!String(error.stderr).includes('No such image')) failures.push(error)
      }
      if (directory) {
        try {
          await rm(directory, { recursive: true, force: true })
        } catch (error) {
          failures.push(error)
        }
      }
    })())
  for (const [signal, handler] of signalHandlers) process.on(signal, handler)
  try {
    directory = await mkdtemp(join(tmpdir(), `${id}-`))
    console.log(
      `Container smoke: ${id} (${context}, ${rootless ? 'rootless' : 'rootful'}, uid ${user})`,
    )
    await Promise.race([
      Promise.resolve().then(() => {
        assert.equal(signalExitCode, undefined, 'Docker smoke was interrupted')
        return scenario({ directory, image, command: execute, run, start })
      }),
      cancellation,
    ])
  } catch (error) {
    failures.push(error)
  } finally {
    await cleanup()
    for (const [signal, handler] of signalHandlers) process.off(signal, handler)
  }
  if (signalExitCode) {
    for (const failure of failures) console.error(failure)
    process.exit(signalExitCode)
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length) throw new AggregateError(failures, 'Container smoke and cleanup failed')
}
