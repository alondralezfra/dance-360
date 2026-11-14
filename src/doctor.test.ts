import { describe, expect, it } from 'vitest'
import { checkBrowser, checkDependencies, checkHooks, checkNode, checkPort, formatReport, requiredNodeMajor } from '../scripts/doctorChecks.ts'

// The judging behind `npm run doctor` (scripts/doctor.mjs, which only looks at the machine). Docs: docs/testing.md "Setup".

describe('requiredNodeMajor', () => {
  it('reads ">=N" ranges, with or without spaces and minor parts', () => {
    expect(requiredNodeMajor('>=24')).toBe(24)
    expect(requiredNodeMajor(' >= 22.18.0 ')).toBe(22)
  })

  it('does not guess at ranges it cannot read', () => {
    for (const range of ['24', '^24', '>=24 <26', 'lts/*', '']) expect(requiredNodeMajor(range)).toBeNull()
  })
})

describe('checkNode', () => {
  it('passes the required major and anything newer, with or without a leading v', () => {
    expect(checkNode('24.10.0', '>=24').ok).toBe(true)
    expect(checkNode('v26.1.0', '>=24').ok).toBe(true)
  })

  it('fails an older Node and says which to install', () => {
    const check = checkNode('22.9.0', '>=24')
    expect(check.ok).toBe(false)
    expect(check.detail).toMatch(/running 22\.9\.0, need >=24/)
    expect(check.fix).toMatch(/Install Node\.js 24/)
  })

  it('fails, rather than passes, when it cannot tell: no engines, an unreadable range, an unreadable version', () => {
    expect(checkNode('24.0.0', undefined).ok).toBe(false)
    expect(checkNode('24.0.0', '^24').ok).toBe(false)
    expect(checkNode('banana', '>=24').ok).toBe(false)
  })
})

describe('checkDependencies', () => {
  it('passes when everything is installed', () => {
    expect(checkDependencies(['a', 'b'], () => true)).toMatchObject({ ok: true, detail: 'all 2 packages are in node_modules' })
  })

  it('names what is missing, and caps a long list', () => {
    const few = checkDependencies(['a', 'b', 'c'], (name) => name === 'a')
    expect(few).toMatchObject({ ok: false, detail: '2 missing: b, c', fix: 'Run npm install.' })
    const many = checkDependencies(['1', '2', '3', '4', '5', '6', '7'], () => false)
    expect(many.detail).toBe('7 missing: 1, 2, 3, 4, 5, and 2 more')
  })

  it('has nothing to complain about when nothing is declared', () => {
    expect(checkDependencies([], () => false).ok).toBe(true)
  })
})

describe('checkHooks', () => {
  it('passes when the pre-commit hook folder is set (ignoring the newline git prints)', () => {
    expect(checkHooks('.githooks\n').ok).toBe(true)
  })

  it('fails when it is unset or points somewhere else', () => {
    expect(checkHooks('')).toMatchObject({ ok: false, detail: expect.stringMatching(/not set/) })
    expect(checkHooks('.husky\n')).toMatchObject({ ok: false, detail: expect.stringMatching(/"\.husky"/) })
  })
})

describe('checkBrowser', () => {
  it('locally, wants Edge', () => {
    expect(checkBrowser({ ci: false, edgeFound: true, chromiumFound: false }).ok).toBe(true)
  })

  it('locally without Edge, points at CI=1 when Chromium is there, or at installing one when neither is', () => {
    expect(checkBrowser({ ci: false, edgeFound: false, chromiumFound: true })).toMatchObject({ ok: false, fix: expect.stringMatching(/CI=1/) })
    expect(checkBrowser({ ci: false, edgeFound: false, chromiumFound: false })).toMatchObject({ ok: false, fix: expect.stringMatching(/playwright install chromium/) })
  })

  it('with CI=1, wants Playwright\'s Chromium and does not care about Edge', () => {
    expect(checkBrowser({ ci: true, edgeFound: false, chromiumFound: true }).ok).toBe(true)
    expect(checkBrowser({ ci: true, edgeFound: true, chromiumFound: false })).toMatchObject({ ok: false, fix: 'Run npx playwright install chromium.' })
  })
})

describe('checkPort', () => {
  it('passes a free port and fails a busy one, naming the port', () => {
    expect(checkPort(5199, false)).toMatchObject({ ok: true, name: 'Port 5199 free' })
    expect(checkPort(5199, true)).toMatchObject({ ok: false, detail: expect.stringMatching(/port 5199/) })
  })
})

describe('formatReport', () => {
  it('lists each check, puts the fix under a failure, and says everything is in place when it is', () => {
    const text = formatReport([checkPort(5199, false), checkNode('24.0.0', '>=24')])
    expect(text).toMatch(/ok {4}Port 5199 free/)
    expect(text).not.toMatch(/->/)
    expect(text).toMatch(/Everything needed/)
  })

  it('counts the failures and shows the fix for each', () => {
    const text = formatReport([checkNode('20.0.0', '>=24'), checkPort(5199, true), checkHooks('.githooks')])
    expect(text).toMatch(/FAIL {2}Node\.js version: running 20\.0\.0/)
    expect(text).toMatch(/-> Install Node\.js 24/)
    expect(text).toMatch(/-> Stop that program/)
    expect(text).toMatch(/2 of 3 checks failed/)
  })
})
