import { describe, expect, it } from 'vitest'

// Guards the repository's automation settings (.github/, package.json scripts), which nothing else
// exercises until a pull request is opened on GitHub. If one fails, a safeguard was weakened or broken
// by accident: put it back rather than loosening the test, unless the safeguard is deliberately changing
// (then update docs/operations-and-quality.md and the decision record, docs/decisions/0022).

const raw = import.meta.glob(['/.github/**/*.{yml,yaml}', '/package.json'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const file = (path: string) => {
  const text = raw[path]
  if (text === undefined) throw new Error(`${path} is missing`)
  return text.replace(/\r\n/g, '\n') // (a Windows checkout may have CRLF line ends)
}
const workflows = Object.keys(raw)
  .filter((path) => path.startsWith('/.github/workflows/'))
  .map((path) => [path, file(path)] as const)

describe('dependency updates (Dependabot)', () => {
  const dependabot = file('/.github/dependabot.yml')

  it('watches the app libraries and the GitHub Actions, weekly', () => {
    expect(dependabot).toMatch(/package-ecosystem: npm/)
    expect(dependabot).toMatch(/package-ecosystem: github-actions/)
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(2)
  })

  it('brings small updates together and leaves major ones to open on their own', () => {
    expect(dependabot).toMatch(/update-types: \[minor, patch\]/)
    expect(dependabot).not.toMatch(/\bmajor\b.*\n.*groups/)
  })

  it('does not flood the repository with pull requests', () => {
    for (const limit of dependabot.matchAll(/open-pull-requests-limit: (\d+)/g)) expect(Number(limit[1])).toBeLessThanOrEqual(5)
  })
})

describe('the security workflow', () => {
  const security = file('/.github/workflows/security.yml')

  it('runs on every pull request, on main, and weekly on its own', () => {
    expect(security).toMatch(/^on:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:/m)
    expect(security).toMatch(/schedule:\n\s+- cron: '[^']+'/)
  })

  it('blocks on high or critical advisories in the libraries that ship in the app', () => {
    expect(security).toMatch(/run: npm audit --omit=dev --audit-level=high\s*$/m)
  })

  it('only warns about the build and test tools, so a tool advisory with no fix cannot block every pull request', () => {
    expect(security).toMatch(/if ! npm audit --audit-level=high; then\s+echo "::warning::/)
  })

  it('scans the whole history for secrets', () => {
    expect(security).toMatch(/uses: gitleaks\/gitleaks-action@v\d/)
    expect(security).toMatch(/fetch-depth: 0/)
  })

  it('has read-only access to the repository', () => {
    expect(security).toMatch(/^permissions:\n {2}contents: read\s*$/m)
    expect(security).not.toMatch(/: write\b/)
  })
})

describe('all workflows', () => {
  it('there are some (so these checks are not passing on nothing)', () => {
    expect(workflows.length).toBeGreaterThanOrEqual(2)
  })

  it('use an action by a version tag or commit, never by a moving branch', () => {
    for (const [path, text] of workflows) {
      for (const use of text.matchAll(/uses: ([^\s#]+)/g)) {
        expect(use[1], `${path} uses ${use[1]}`).toMatch(/@(v\d[\w.]*|[0-9a-f]{40})$/)
      }
    }
  })

  it('give a pull request no more access than it needs', () => {
    for (const [path, text] of workflows) expect(text, `${path} writes`).not.toMatch(/(contents|pull-requests|id-token): write/)
  })

  it('keep the CI job that runs the whole verification, under the name branch protection expects', () => {
    const ci = file('/.github/workflows/ci.yml')
    expect(ci).toMatch(/^name: CI$/m)
    expect(ci).toMatch(/^ {2}verify:$/m)
    expect(ci).toMatch(/run: npm run verify/)
  })
})

describe('the local dependency check', () => {
  it('is an npm script that runs the same blocking audit as CI', () => {
    const scripts = (JSON.parse(file('/package.json')) as { scripts: Record<string, string> }).scripts
    expect(scripts['check:deps']).toBe('npm audit --omit=dev --audit-level=high')
  })
})
