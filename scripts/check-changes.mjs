// Change-discipline check. If application code changed, the same change must
// also include tests, documentation, and a changelog entry.
//
//   node scripts/check-changes.mjs            checks uncommitted work (vs HEAD)
//   node scripts/check-changes.mjs --base origin/main   checks everything since that ref (CI on pull requests)
//
// Nothing changed (clean tree) => passes. This is a guard rail, not a judge of
// quality: the docs and tests still have to be real (see CLAUDE.md).

import { execSync } from 'node:child_process'

const baseIndex = process.argv.indexOf('--base')
const base = baseIndex === -1 ? null : process.argv[baseIndex + 1]
if (baseIndex !== -1 && !base) {
  console.error('--base needs a git ref, e.g. --base origin/main')
  process.exit(2)
}

const git = (cmd) =>
  execSync(`git -c core.quotepath=off ${cmd}`, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

const files = base
  ? git(`diff ${base}...HEAD --name-only`)
  : [...new Set([...git('diff HEAD --name-only'), ...git('ls-files --others --exclude-standard')])]

const isTest = (f) => /\.test\.tsx?$/.test(f) || f.startsWith('e2e/') || /^src\/.*\/fixtures\//.test(f)
const isAppCode = (f) => /^src\/.*\.(ts|tsx|css)$/.test(f) && !isTest(f)

const appCode = files.filter(isAppCode)
if (appCode.length === 0) {
  console.log('No application code changed; nothing to check.')
  process.exit(0)
}

const problems = []
if (!files.some(isTest)) {
  problems.push('No tests changed. Add or update tests (unit/integration in src/**/*.test.ts(x), flows in e2e/).')
}
if (!files.includes('CHANGELOG.md')) {
  problems.push('CHANGELOG.md was not updated. Add an entry under "Unreleased".')
}
if (!files.some((f) => f.startsWith('docs/') || f === 'README.md')) {
  problems.push('No documentation changed. Update the relevant file in docs/ (feature doc, architecture, or a decision record).')
}

if (problems.length === 0) {
  console.log(`OK: ${appCode.length} app file(s) changed, with tests, docs and changelog.`)
  process.exit(0)
}

console.error('Change discipline check FAILED. Application code changed:')
for (const f of appCode.slice(0, 12)) console.error(`  - ${f}`)
if (appCode.length > 12) console.error(`  ...and ${appCode.length - 12} more`)
console.error('\nbut:')
for (const p of problems) console.error(`  x ${p}`)
process.exit(1)
