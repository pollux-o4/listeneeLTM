import assert from 'node:assert/strict'
import { chmod, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { mount, withDockerSmoke } from '../docker.mjs'

const [, , binary, action] = process.argv
assert.ok(['throw', 'wait'].includes(action))
await withDockerSmoke(async ({ directory, image, command, start }) => {
  await copyFile(binary, join(directory, 'ltm'))
  await chmod(join(directory, 'ltm'), 0o755)
  await writeFile(
    join(directory, 'Dockerfile'),
    'FROM scratch\nCOPY ltm /ltm\nENTRYPOINT ["/ltm"]\n',
  )
  command('build', '--network=none', '--pull=false', '--tag', image, directory)
  const project = join(directory, 'project')
  await mkdir(project)
  const target = start(
    ...mount(project, '/project', false),
    image,
    '--project',
    '/project',
    'ui',
    '--port',
    '0',
    '--no-open',
  )
  let address
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(command('inspect', '--format', '{{.State.Running}}', target).trim(), 'true')
    address = command('logs', target).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
    if (address) break
    await setTimeout(100)
  }
  assert.ok(address, 'Fixture UI server must start before exercising cleanup')
  process.send({ directory, image, target, address })
  if (action === 'throw') throw new Error('Fixture failure after UI startup')
  await setTimeout(30_000)
  throw new Error('Parent did not send the cancellation signal')
})
