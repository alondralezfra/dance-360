// The one command that decides whether a change is "done".
//
//   npm run verify           everything (required before a change counts as implemented)
//   npm run verify:quick     skips the browser (e2e) tests; for iterating, NOT for sign-off
//
// Steps run in order, cheapest first, and stop at the first failure.

import { spawnSync } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const quick = args.has('--quick')
const staged = args.has('--staged')

const steps = [
  { name: 'Change discipline (tests + docs + changelog)', cmd: ['node', 'scripts/check-changes.mjs', ...(staged ? ['--staged'] : [])] },
  { name: 'Lint', cmd: ['npm', 'run', '--silent', 'lint'] },
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
if (quick) console.log('  (quick mode: e2e skipped; run the full `npm run verify` before finishing)')

const failed = results.find((r) => !r.ok)
if (failed) {
  console.error(`\nverify FAILED at: ${failed.name}`)
  process.exit(1)
}
console.log('\nverify passed.')
