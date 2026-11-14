// `npm run doctor`: checks this machine can work on Dance 360 (Node version, installed packages, the
// git pre-commit hook, a browser for the end-to-end tests, a free test port) and says how to fix what
// is wrong. It only reports: it never installs or changes anything. The judging is in doctorChecks.ts
// (tested); this file only looks at the machine. Run with Node 24 (it loads TypeScript directly).

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkBrowser, checkDependencies, checkHooks, checkNode, checkPort, formatReport } from './doctorChecks.ts'

const PORT = 5199 // the end-to-end tests serve the production build here (playwright.config.ts)

process.chdir(realpathSync.native(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')))
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

function gitHooksPath() {
  const result = spawnSync('git', ['config', 'core.hooksPath'], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout : ''
}

function edgeInstalled() {
  const env = process.env
  const candidates = {
    win32: [env['ProgramFiles(x86)'], env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean).map((root) => path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
    darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    linux: ['/opt/microsoft/msedge/msedge', '/usr/bin/microsoft-edge'],
  }
  return (candidates[process.platform] ?? []).some((file) => existsSync(file))
}

async function chromiumInstalled() {
  try {
    const { chromium } = await import('@playwright/test')
    return existsSync(chromium.executablePath())
  } catch {
    return false // Playwright itself is not installed: the dependencies check says so
  }
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: 'localhost' })
    socket.setTimeout(1000)
    socket.once('connect', () => (socket.destroy(), resolve(true)))
    socket.once('timeout', () => (socket.destroy(), resolve(false)))
    socket.once('error', () => resolve(false))
  })
}

const checks = [
  checkNode(process.versions.node, pkg.engines?.node),
  checkDependencies([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})], (name) => existsSync(path.join('node_modules', name, 'package.json'))),
  checkHooks(gitHooksPath()),
  checkBrowser({ ci: Boolean(process.env.CI), edgeFound: edgeInstalled(), chromiumFound: await chromiumInstalled() }),
  checkPort(PORT, await portInUse(PORT)),
]

console.log(`\nDance 360 setup check\n\n${formatReport(checks)}\n`)
process.exit(checks.every((check) => check.ok) ? 0 : 1)
