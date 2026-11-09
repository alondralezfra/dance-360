import { describe, expect, it } from 'vitest'

// Architecture rules, enforced automatically. If one of these fails, the code
// broke a rule from docs/architecture.md; fix the code, don't loosen the test
// (unless you are deliberately changing the rule, in which case update the doc
// and add a decision record in docs/decisions/).

const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const docs = import.meta.glob('/docs/features/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

const isTest = (path: string) => /\.test\.tsx?$/.test(path) || path.includes('/src/test/')
const appFiles = Object.entries(sources).filter(([path]) => !isTest(path))
const inDir = (dir: string) => appFiles.filter(([path]) => path.startsWith(`/src/${dir}/`))

const importsOf = (code: string) => [...code.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1])

function offenders(files: [string, string][], test: (path: string, code: string) => string | null) {
  return files.map(([path, code]) => test(path, code)).filter((x): x is string => x !== null)
}

describe('layering', () => {
  it('model/ is pure: no React, state, canvas, storage or UI imports', () => {
    const bad = offenders(inDir('model'), (path, code) => {
      const forbidden = importsOf(code).filter(
        (i) => /^(react|react-dom|zustand|konva|react-konva|react-router)/.test(i) || /\.\.\/(store|persistence|features|components|theme)/.test(i),
      )
      return forbidden.length ? `${path} imports ${forbidden.join(', ')}` : null
    })
    expect(bad).toEqual([])
  })

  it('persistence/ does not depend on the UI or the store', () => {
    const bad = offenders(inDir('persistence'), (path, code) => {
      const forbidden = importsOf(code).filter((i) => /^(react|zustand)/.test(i) || /\.\.\/(store|features|components|theme)/.test(i))
      return forbidden.length ? `${path} imports ${forbidden.join(', ')}` : null
    })
    expect(bad).toEqual([])
  })

  it('only the store and the projects feature talk to persistence', () => {
    const bad = offenders(
      appFiles.filter(([p]) => !p.startsWith('/src/store/') && !p.startsWith('/src/persistence/') && !p.startsWith('/src/features/projects/')),
      (path, code) => (importsOf(code).some((i) => /persistence/.test(i)) ? `${path} imports persistence` : null),
    )
    expect(bad).toEqual([])
  })

  it('browser storage is only touched in persistence/ and theme/', () => {
    const bad = offenders(
      appFiles.filter(([p]) => !p.startsWith('/src/persistence/') && !p.startsWith('/src/theme/')),
      (path, code) => (/\b(localStorage|sessionStorage|indexedDB)\b/.test(code) ? `${path} uses browser storage directly` : null),
    )
    expect(bad).toEqual([])
  })

  it('the browser audio engine is only touched in audio/', () => {
    const bad = offenders(
      appFiles.filter(([p]) => !p.startsWith('/src/audio/')),
      (path, code) =>
        /\b(AudioContext|OfflineAudioContext|webkitAudioContext|HTMLAudioElement|createMediaElementSource)\b|new Audio\(/.test(code)
          ? `${path} uses the browser audio engine directly`
          : null,
    )
    expect(bad).toEqual([])
  })

  it('audio/ only talks to the browser: no store, storage, UI or theme imports', () => {
    const bad = offenders(inDir('audio'), (path, code) => {
      const forbidden = importsOf(code).filter(
        (i) => /^(react|react-dom|zustand|react-router)/.test(i) || /\.\.\/(store|persistence|features|components|theme)/.test(i),
      )
      return forbidden.length ? `${path} imports ${forbidden.join(', ')}` : null
    })
    expect(bad).toEqual([])
  })

  it('screens (features/) do not reach into other features', () => {
    const bad = offenders(inDir('features'), (path, code) => {
      const own = path.split('/')[3]
      const foreign = importsOf(code).filter((i) => {
        const m = i.match(/\.\.\/(?!\.)([a-z]+)\//)
        return m && !['components', 'model', 'store', 'persistence', 'theme', 'lib', own].includes(m[1])
      })
      // Composition is allowed one way: a page may compose other features' components.
      return foreign.length && !path.endsWith('Page.tsx') && !path.endsWith('Workspace.tsx')
        ? `${path} imports ${foreign.join(', ')}`
        : null
    })
    expect(bad).toEqual([])
  })
})

describe('styling', () => {
  const uiFiles = appFiles.filter(([p]) => p.endsWith('.tsx') || p.startsWith('/src/features/'))
  const palette =
    /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|accent|caret|decoration|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?\b/

  it('uses theme tokens (bg-primary), never raw palette colors (bg-indigo-600)', () => {
    const bad = offenders(uiFiles, (path, code) => {
      const hit = code.match(palette)
      return hit ? `${path} uses raw color "${hit[0]}"` : null
    })
    expect(bad).toEqual([])
  })

  it('has no hard-coded hex colors in components (use tokens / the canvas theme)', () => {
    const bad = offenders(uiFiles, (path, code) => {
      const hit = code.match(/#[0-9a-fA-F]{3,8}\b/)
      return hit ? `${path} hard-codes ${hit[0]}` : null
    })
    expect(bad).toEqual([])
  })
})

describe('components', () => {
  // Controls are built once, in components/ui/, and reused (see docs/components.md).
  // If a screen needs a control that doesn't exist, add a variant/prop there first.
  const screens = appFiles.filter(([p]) => p.endsWith('.tsx') && !p.startsWith('/src/components/ui/'))

  it('screens use the shared controls instead of raw <button>, <input>, <select>, <textarea> or <svg>', () => {
    const bad = offenders(screens, (path, code) => {
      const hit = code.match(/<(button|input|select|textarea|svg)[\s>]/)
      return hit ? `${path} uses a raw <${hit[1]}>: use Button / Input / Select / Checkbox / Icon from components/ui` : null
    })
    expect(bad).toEqual([])
  })

  it('icons are Icon components, not text symbols that change with the font', () => {
    const bad = offenders(screens, (path, code) => {
      const hit = code.match(/[✕✖◀▶▲▼▾▴☀☾›‹]/)
      return hit ? `${path} uses the text symbol "${hit[0]}": add it to Icon and use <Icon>/<IconButton>` : null
    })
    expect(bad).toEqual([])
  })
})

describe('documentation', () => {
  it('every feature folder has a doc in docs/features/', () => {
    const features = new Set(
      Object.keys(sources)
        .map((p) => p.match(/^\/src\/features\/([^/]+)\//)?.[1])
        .filter((x): x is string => !!x),
    )
    const documented = new Set(Object.keys(docs).map((p) => p.match(/\/docs\/features\/(.+)\.md$/)![1]))
    const missing = [...features].filter((f) => !documented.has(f))
    expect(missing).toEqual([])
  })
})
