#!/usr/bin/env node
const { spawn } = require('node:child_process')
const { constants } = require('node:os')
const platforms = require('../platforms.json')

function selectPlatform(os = process.platform, arch = process.arch) {
  const platform = platforms.find((entry) => entry.os === os && entry.arch === arch)
  if (!platform) throw new Error(`Unsupported platform: ${os}-${arch}`)
  return platform
}

function resolveBinary(platform = selectPlatform()) {
  try {
    return require.resolve(`${platform.package}/bin/${platform.binary}`)
  } catch (cause) {
    throw new Error(
      `Missing ${platform.package}. Reinstall listenee-ltm with optional dependencies enabled.`,
      { cause },
    )
  }
}

function launch(binary, args = process.argv.slice(2)) {
  const child = spawn(binary, args, { stdio: 'inherit', windowsHide: true })
  const handlers = new Map()
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    const handler = () => child.kill(signal)
    handlers.set(signal, handler)
    process.on(signal, handler)
  }
  const cleanup = () => {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler)
  }
  child.once('error', (error) => {
    cleanup()
    console.error(`ltm: ${error.message}`)
    process.exitCode = 1
  })
  child.once('exit', (code, signal) => {
    cleanup()
    if (signal) {
      process.exitCode = 128 + (constants.signals[signal] || 1)
      process.kill(process.pid, signal)
    } else {
      process.exitCode = code ?? 1
    }
  })
}

module.exports = { selectPlatform, resolveBinary, launch }

if (require.main === module) {
  try {
    launch(resolveBinary())
  } catch (error) {
    console.error(`ltm: ${error.message}`)
    process.exitCode = 1
  }
}
