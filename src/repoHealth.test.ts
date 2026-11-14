import { describe, expect, it } from 'vitest'
import { findBrokenDocReferences, findOversized, lineCount, SIZE_ALLOWLIST } from './test/repoHealth'

// Repo-health checks (docs/architecture.md, "Repo health"). If one fails, fix the repo, don't loosen the check:
// split the big file, or correct the document so it describes what is really there. Duplicate code and unused
// code are checked by `npm run check:health` (jscpd, knip), not here.

const lines = (n: number) => 'x\n'.repeat(n)

describe('lineCount', () => {
  it('counts lines, ignoring the final newline and either line ending', () => {
    expect(lineCount('')).toBe(0)
    expect(lineCount('a')).toBe(1)
    expect(lineCount('a\nb\n')).toBe(2)
    expect(lineCount('a\r\nb\r\n')).toBe(2)
  })
})

describe('findOversized', () => {
  const limits = { app: 10, test: 20 }

  it('passes files within their limits, and gives tests a higher limit than app code', () => {
    expect(findOversized({ '/src/a.ts': lines(10), '/src/a.test.ts': lines(20), '/e2e/b.spec.ts': lines(20) }, {}, limits)).toEqual([])
  })

  it('names an app file over its limit and a test file over its limit', () => {
    const problems = findOversized({ '/src/a.ts': lines(11), '/src/a.test.ts': lines(21) }, {}, limits)
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/\/src\/a\.ts has 11 lines \(limit 10\)/)
    expect(problems[1]).toMatch(/\/src\/a\.test\.ts has 21 lines \(limit 20\)/)
  })

  it('lets an allowlisted file through', () => {
    expect(findOversized({ '/src/a.ts': lines(50) }, { '/src/a.ts': 'generated table' }, limits)).toEqual([])
  })

  it('flags allowlist entries that are stale: the file is gone, or is now within its limit', () => {
    const problems = findOversized({ '/src/small.ts': lines(3) }, { '/src/gone.ts': 'x', '/src/small.ts': 'x' }, limits)
    expect(problems).toEqual([
      expect.stringMatching(/gone\.ts is on the size allowlist but does not exist/),
      expect.stringMatching(/small\.ts is on the size allowlist but is within its limit/),
    ])
  })

  it('holds for the real source files', () => {
    expect(findOversized(sources)).toEqual([])
  })

  it('has an allowlist whose every entry says why', () => {
    for (const reason of Object.values(SIZE_ALLOWLIST)) expect(reason.trim()).not.toBe('')
  })
})

describe('findBrokenDocReferences', () => {
  const present = new Set(['/src/model/playback.ts', '/src/model', '/docs/testing.md', '/README.md'])
  const exists = (path: string) => present.has(path)

  it('accepts links and backticked paths that exist, however they are written', () => {
    const doc = [
      '[testing](testing.md#layers) and [the readme](../README.md) and [site](https://example.com)',
      'See `src/model/playback.ts`, `model/playback.ts`, `src/model/`, `docs/testing.md:12` and `positionsAt()`.',
    ].join('\n')
    expect(findBrokenDocReferences({ '/docs/architecture.md': doc }, exists)).toEqual([])
  })

  it('reports a link to a missing file and a backticked path that is not there', () => {
    const doc = '[gone](nope.md) and `src/model/removed.ts`.'
    expect(findBrokenDocReferences({ '/docs/architecture.md': doc }, exists)).toEqual([
      '/docs/architecture.md links to nope.md, which does not exist',
      '/docs/architecture.md mentions src/model/removed.ts, which does not exist',
    ])
  })

  it('ignores code blocks, patterns, placeholders and things that are not repo paths', () => {
    const doc = ['```', 'src/model/removed.ts', '```', '`src/**/*.test.ts` `src/persistence/fixtures/v<N>.json` `a/b` `https://x.dev/a.ts`'].join('\n')
    expect(findBrokenDocReferences({ '/docs/architecture.md': doc }, exists)).toEqual([])
  })

  it('reports each problem once even when it is repeated', () => {
    expect(findBrokenDocReferences({ '/README.md': '`src/a.ts` `src/a.ts`' }, exists)).toHaveLength(1)
  })

  it('holds for the real documents: they mention only files and folders that exist', () => {
    expect(findBrokenDocReferences(documents, (path) => paths.has(path) || [...paths].some((p) => p.startsWith(`${path}/`)))).toEqual([])
  })
})

// The real repo. (Records of past decisions and the changelog are history: they may name files that were later renamed.)
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '/e2e/**/*.ts', '/scripts/*.{mjs,ts}'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const documents = import.meta.glob(['/docs/*.md', '/docs/features/*.md', '/README.md', '/CLAUDE.md', '/dance-director-app-plan.md', '/.claude/skills/*/SKILL.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
// (import.meta.glob leaves out the file that calls it, so this test file is added by hand.)
const paths = new Set(
  ['/src/repoHealth.test.ts', ...Object.keys(
    import.meta.glob(
      ['/src/**', '/docs/**', '/e2e/**', '/scripts/**', '/public/**', '/.github/**', '/.claude/**', '/*.md', '/*.json', '/*.ts', '/*.mjs', '/index.html'],
      { eager: false },
    ),
  )],
)
