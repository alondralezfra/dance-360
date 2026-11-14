// Claude Code "Stop" hook: when Claude is about to finish a turn, make sure the
// uncommitted work actually passes `npm run verify`. If it doesn't, Claude is
// sent back to fix it instead of finishing.
//
// Skips instantly when there is nothing code-related to verify (e.g. a
// question, or a docs-only edit), so it never slows down plain conversation.
//
// Exit codes (Claude Code hook protocol): 0 = allow stop, 2 = block with the
// message on stderr fed back to Claude.

import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  // no/invalid stdin: treat as a first-time stop
}

const changed = execSync('git -c core.quotepath=off status --porcelain', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).replace(/^"|"$/g, ''))

const needsVerify = changed.some((f) =>
  /^(src|e2e|scripts)\//.test(f) ||
  /^(package(-lock)?\.json|vite\.config\.ts|playwright\.config\.ts|tsconfig.*\.json|index\.html)$/.test(f),
)
if (!needsVerify) process.exit(0)

const run = spawnSync('npm run --silent verify', { encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 })
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
const tail = output.split('\n').slice(-80).join('\n')

if (run.status === 0) {
  console.log(JSON.stringify({ systemMessage: 'verify passed (lint, tests, coverage, build, e2e, docs check).' }))
  process.exit(0)
}

// Already sent back once this turn: don't trap Claude in a loop. Surface it to the user instead.
if (input.stop_hook_active) {
  console.log(JSON.stringify({ systemMessage: `WARNING: verify is still failing. This work is NOT done.\n${tail}` }))
  process.exit(0)
}

console.error(
  `Not done yet: \`npm run verify\` failed. Fix the root cause (do not weaken, skip or delete tests), then re-run it.\n\n${tail}`,
)
process.exit(2)
