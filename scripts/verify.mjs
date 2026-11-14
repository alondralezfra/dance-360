// The one command that decides whether a change is "done".
//
//   npm run verify           everything (required before a change counts as implemented)
//   npm run verify:quick     skips the browser (e2e) tests; for iterating, NOT for sign-off
//
// (File size and docs-name-real-files are checked by src/repoHealth.test.ts, in the unit-test step.)
// Steps run in order, cheapest first, and stop at the first failure.

import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'

// On Windows a working directory spelled with a lower-case drive letter (c:\...) makes Vitest load itself
// twice (Node and Vite disagree about the path), and every test file then fails with "Vitest failed to
// find the current suite". Claude Code's Stop hook starts here that way, though a normal terminal does not.
// Use the canonical spelling for this process and every step it starts. (A no-op elsewhere.)
try {
  process.chdir(realpathSync.native(process.cwd()))
} catch {
  // keep the directory we were started in
}

const args = new Set(process.argv.slice(2))
const quick = args.has('--quick')

const steps = [
  { name: 'Change discipline (tests + docs + changelog)', cmd: ['node', 'scripts/check-changes.mjs'] },
  { name: 'Lint', cmd: ['npm', 'run', '--silent', 'lint'] },
  { name: 'Repo health (unused code, duplicate code and docs)', cmd: ['npm', 'run', '--silent', 'check:health'] },
  { name: 'Unit + integration tests (with coverage thresholds)', cmd: ['npm', 'run', '--silent', 'test:coverage'] },
  { name: 'Type-check + production build', cmd: ['npm', 'run', '--silent', 'build'] },
  ...(quick ? [] : [{ name: 'End-to-end tests (real browser)', cmd: ['npm', 'run', '--silent', 'test:e2e'] }]),
]

const results = []
for (const [i, step] of steps.entries()) {
  console.log(`\n━━ [${i + 1}/${steps.length}] ${step.name}`)
  const started = Date.now()
  const r = spawnSync(step.cmd.join(' '), { stdio: 'inherit', shell: true })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const ok = r.status === 0
  results.push({ name: step.name, ok, seconds })
  if (!ok) break
}

console.log('\n━━ verify summary')
for (const r of results) console.log(`${r.ok ? '  PASS' : '  FAIL'}  ${r.name} (${r.seconds}s)`)
if (quick) console.log('  (quick mode: e2e skipped; the full verify runs when Claude finishes a turn, and in CI on the pull request)')

const failed = results.find((r) => !r.ok)
if (failed) {
  console.error(`\nverify FAILED at: ${failed.name}`)
  if (failed.name.startsWith('End-to-end')) {
    console.error('If the failure is about a missing browser or a busy port, `npm run doctor` checks this machine and says how to fix it.')
  }
  process.exit(1)
}
console.log('\nverify passed.')
