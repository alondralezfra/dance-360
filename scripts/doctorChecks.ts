// The checks behind `npm run doctor` (scripts/doctor.mjs), as pure functions: they are given what the
// script found on this machine and say whether it is good enough, so they can be tested with made-up
// answers. Nothing here reads the machine, and nothing here fixes anything: it reports and names the fix.
// Decision record: docs/decisions/0025-setup-check.md

export interface Check {
  name: string
  ok: boolean
  detail: string
  /** What to do about it. Present when `ok` is false. */
  fix?: string
}

const pass = (name: string, detail: string): Check => ({ name, ok: true, detail })
const fail = (name: string, detail: string, fix: string): Check => ({ name, ok: false, detail, fix })

/** The major version a range such as ">=24" asks for, or null for a range this check does not understand. */
export function requiredNodeMajor(range: string): number | null {
  const match = /^>=\s*(\d+)(\.\d+){0,2}$/.exec(range.trim())
  return match ? Number(match[1]) : null
}

export function checkNode(actual: string, enginesRange: string | undefined): Check {
  const name = 'Node.js version'
  if (enginesRange === undefined) return fail(name, 'package.json has no engines.node', 'Add "engines": { "node": ">=24" } to package.json.')
  const required = requiredNodeMajor(enginesRange)
  if (required === null) return fail(name, `engines.node is "${enginesRange}", which this check cannot read`, 'Write it as ">=N", for example ">=24".')
  const major = Number(actual.replace(/^v/, '').split('.')[0])
  if (!Number.isInteger(major)) return fail(name, `could not read the running version "${actual}"`, 'Reinstall Node.js from nodejs.org.')
  if (major < required) return fail(name, `running ${actual}, need ${enginesRange}`, `Install Node.js ${required} or newer (nodejs.org), then run npm install again.`)
  return pass(name, `${actual} (needs ${enginesRange})`)
}

export function checkDependencies(declared: string[], isInstalled: (name: string) => boolean): Check {
  const name = 'Dependencies installed'
  const missing = declared.filter((dep) => !isInstalled(dep))
  if (missing.length === 0) return pass(name, `all ${declared.length} packages are in node_modules`)
  const shown = missing.slice(0, 5).join(', ') + (missing.length > 5 ? `, and ${missing.length - 5} more` : '')
  return fail(name, `${missing.length} missing: ${shown}`, 'Run npm install.')
}

export function checkHooks(hooksPath: string): Check {
  const name = 'Git hooks'
  if (hooksPath.trim() === '.githooks') return pass(name, 'the pre-commit hook (.githooks) is switched on')
  return fail(
    name,
    hooksPath.trim() === '' ? 'core.hooksPath is not set, so the pre-commit check will not run' : `core.hooksPath is "${hooksPath.trim()}", not ".githooks"`,
    'Run npm install (its prepare step sets it), or: git config core.hooksPath .githooks',
  )
}

export interface BrowserFacts {
  /** True when CI=1 is set: the tests then use Playwright's own Chromium instead of Edge. */
  ci: boolean
  edgeFound: boolean
  chromiumFound: boolean
}

export function checkBrowser({ ci, edgeFound, chromiumFound }: BrowserFacts): Check {
  const name = 'Browser for the end-to-end tests'
  if (ci) {
    return chromiumFound
      ? pass(name, "CI=1 is set and Playwright's Chromium is installed")
      : fail(name, "CI=1 is set but Playwright's Chromium is not installed", 'Run npx playwright install chromium.')
  }
  if (edgeFound) return pass(name, 'Microsoft Edge is installed (what the tests use locally)')
  if (chromiumFound) {
    return fail(name, "Edge was not found, but Playwright's Chromium is installed", 'Run the tests with CI=1 set, for example CI=1 npm run verify.')
  }
  return fail(name, 'neither Microsoft Edge nor Playwright\'s Chromium was found', 'Install Microsoft Edge, or run npx playwright install chromium and set CI=1 when you run the tests.')
}

export function checkPort(port: number, inUse: boolean): Check {
  const name = `Port ${port} free`
  return inUse
    ? fail(name, `something is already listening on port ${port}, and the end-to-end tests serve the app there`, `Stop that program (a leftover npm run preview?), then try again.`)
    : pass(name, 'nothing is using it')
}

/** The report as printed: one line per check, with the fix under each failure, and a closing summary. */
export function formatReport(checks: Check[]): string {
  const lines = checks.flatMap((check) => [
    `  ${check.ok ? 'ok  ' : 'FAIL'}  ${check.name}: ${check.detail}`,
    ...(check.ok || !check.fix ? [] : [`        -> ${check.fix}`]),
  ])
  const failed = checks.filter((check) => !check.ok).length
  lines.push('', failed === 0 ? 'Everything needed to work on Dance 360 is in place.' : `${failed} of ${checks.length} checks failed. Fix those, then run npm run doctor again.`)
  return lines.join('\n')
}
