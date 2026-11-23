import { describe, expect, it } from 'vitest'
import { requiredNodeMajor } from '../scripts/doctorChecks.ts'

// Guards the repository's automation settings (.github/, package.json scripts), which nothing else
// exercises until a pull request is opened on GitHub. If one fails, a safeguard was weakened or broken
// by accident: put it back rather than loosening the test, unless the safeguard is deliberately changing
// (then update docs/operations-and-quality.md and the decision record, docs/decisions/0022).

const raw = import.meta.glob(['/.github/**/*.{yml,yaml}', '/package.json', '/.gitignore', '/playwright.screenshots.config.ts', '/wrangler.jsonc', '/public/_headers', '/index.html', '/.claude/skills/*/SKILL.md'], {
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

describe('hosting on Cloudflare (decision 0035)', () => {
  const deploy = file('/.github/workflows/deploy.yml')
  const wrangler = file('/wrangler.jsonc')
  const headers = file('/public/_headers')

  it('serves the built app, and falls back to index.html so a reload on a deep address works', () => {
    expect(wrangler).toMatch(/"directory": "\.\/dist"/)
    expect(wrangler).toMatch(/"not_found_handling": "single-page-application"/)
  })

  it('serves production on formism.app', () => {
    expect(wrangler).toMatch(/"pattern": "formism\.app", "custom_domain": true/)
  })

  it('deploys production only after CI succeeded on main, never from a pull request', () => {
    expect(deploy).toMatch(/workflow_run:\n\s+workflows: \[CI\]\n\s+types: \[completed\]\n\s+branches: \[main\]/)
    const production = deploy.slice(deploy.indexOf('  production:'), deploy.indexOf('  preview:'))
    expect(production).toMatch(/github\.event_name == 'workflow_run' && github\.event\.workflow_run\.conclusion == 'success'/)
    expect(production).toMatch(/command: deploy$/m)
    const preview = deploy.slice(deploy.indexOf('  preview:'))
    expect(preview).toMatch(/command: versions upload/)
    expect(preview).not.toMatch(/command: deploy$/m)
  })

  it('pins Wrangler 4 in both jobs: the action defaults to 3.90, which cannot read wrangler.jsonc', () => {
    expect(deploy.match(/wranglerVersion: '4\.\d+\.\d+'/g)).toHaveLength(2)
  })

  it('keeps the Cloudflare credentials in repository secrets, never in the file', () => {
    expect(deploy).toMatch(/apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/)
    expect(deploy).toMatch(/accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/)
  })

  it('sends a restrictive security policy that still allows what the app uses (blob: songs, inline styles)', () => {
    const csp = /Content-Security-Policy: (.+)/.exec(headers)?.[1] ?? ''
    for (const directive of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "media-src 'self' blob:"]) {
      expect(csp).toContain(directive)
    }
    expect(csp).not.toMatch(/script-src[^;]*unsafe/)
    expect(headers).toMatch(/X-Content-Type-Options: nosniff/)
  })
})

describe('the app icon', () => {
  const page = file('/index.html')
  const files = Object.keys(import.meta.glob('/public/*.{svg,png}', { query: '?url', import: 'default', eager: true }))

  it('links a vector icon, a PNG fallback and a phone home-screen icon, and each file exists in public/', () => {
    for (const href of ['/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png']) {
      expect(page, `index.html links ${href}`).toContain(`href="${href}"`)
      expect(files, `public${href} exists`).toContain(`/public${href}`)
    }
  })

  it('tells a phone browser the app colour', () => {
    expect(page).toMatch(/<meta name="theme-color" content="#4f46e5" \/>/)
  })
})

describe('the local dependency check', () => {
  it('is an npm script that runs the same blocking audit as CI', () => {
    const scripts = (JSON.parse(file('/package.json')) as { scripts: Record<string, string> }).scripts
    expect(scripts['check:deps']).toBe('npm audit --omit=dev --audit-level=high')
  })
})

describe('the Node version', () => {
  it('is written once, in package.json: CI and the setup check (npm run doctor) use the same major version', () => {
    const engines = (JSON.parse(file('/package.json')) as { engines?: { node?: string } }).engines?.node
    const required = requiredNodeMajor(engines ?? '')
    expect(required, 'package.json needs engines.node written as ">=N"').not.toBeNull()
    for (const [path, text] of workflows) {
      for (const m of text.matchAll(/node-version: (\d+)/g)) expect(Number(m[1]), `${path} node-version`).toBe(required)
    }
  })

  it('is used by at least one workflow, so the check above is not empty', () => {
    expect(workflows.some(([, text]) => /node-version: \d+/.test(text))).toBe(true)
  })
})

describe('the screenshot tool (npm run screenshots)', () => {
  const scripts = () => (JSON.parse(file('/package.json')) as { scripts: Record<string, string> }).scripts

  it('has its own Playwright config that only picks up *.shots.ts, so test:e2e and verify never run it', () => {
    expect(scripts().screenshots).toBe('playwright test -c playwright.screenshots.config.ts')
    expect(scripts()['test:e2e']).toBe('playwright test')
    expect(file('/playwright.screenshots.config.ts')).toContain(String.raw`testMatch: /.*\.shots\.ts$/`)
  })

  it('keeps the pictures out of git', () => {
    expect(file('/.gitignore')).toMatch(/^screenshots$/m)
  })
})

describe('project skills (.claude/skills)', () => {
  const skills = Object.entries(raw).filter(([path]) => path.startsWith('/.claude/skills/'))

  it('has the ui-styling skill', () => {
    expect(skills.map(([path]) => path)).toContain('/.claude/skills/ui-styling/SKILL.md')
  })

  it('names each skill after its folder and says when to use it, so it can be found', () => {
    for (const [path, text] of skills) {
      const folder = path.split('/')[3]
      const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? ''
      expect(front, `${path} needs front matter`).not.toBe('')
      expect(front, `${path} name`).toMatch(new RegExp(`^name: ${folder}$`, 'm'))
      expect(front, `${path} description`).toMatch(/^description: .{40,}/m)
    }
  })
})
