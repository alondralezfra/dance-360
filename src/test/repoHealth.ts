// The repo-health checks (file size, honest docs), as plain functions over made-up or real
// file contents, so repoHealth.test.ts can both test them and run them on the real repo.
// Rules and limits: docs/architecture.md ("Repo health").

export const MAX_APP_LINES = 400
export const MAX_TEST_LINES = 900

/** Source files allowed to exceed their limit, with the reason. Keep this empty if you can: split the file instead. */
export const SIZE_ALLOWLIST: Record<string, string> = {}

const isTestPath = (path: string) => /\.(test|spec)\.tsx?$/.test(path) || path.startsWith('/e2e/') || path.startsWith('/src/test/')

export const lineCount = (text: string) => (text === '' ? 0 : text.replace(/\r?\n$/, '').split(/\r?\n/).length)

/** Files over their limit (app code and tests have different limits), plus allowlist entries that are no longer needed. */
export function findOversized(
  files: Record<string, string>,
  allowlist: Record<string, string> = SIZE_ALLOWLIST,
  limits = { app: MAX_APP_LINES, test: MAX_TEST_LINES },
): string[] {
  const problems: string[] = []
  for (const [path, text] of Object.entries(files)) {
    const lines = lineCount(text)
    const limit = isTestPath(path) ? limits.test : limits.app
    if (lines > limit && !(path in allowlist)) problems.push(`${path} has ${lines} lines (limit ${limit}): split it`)
  }
  for (const path of Object.keys(allowlist)) {
    const text = files[path]
    if (text === undefined) problems.push(`${path} is on the size allowlist but does not exist: remove the entry`)
    else if (lineCount(text) <= (isTestPath(path) ? limits.test : limits.app)) {
      problems.push(`${path} is on the size allowlist but is within its limit: remove the entry`)
    }
  }
  return problems
}

const KNOWN_ROOTS = ['src/', 'docs/', 'e2e/', 'scripts/', '.github/', '.githooks/', '.claude/', 'public/']
const FILE_EXTENSION = /\.(md|ts|tsx|mjs|json|yml|css)$/

/** True for a backticked token that is meant to be a path in this repo (and can be checked). */
function looksLikeRepoPath(token: string): boolean {
  if (/[\s*<>{}()]|\.\.\.|^https?:|^~|^\//.test(token)) return false // a pattern, placeholder, URL or somewhere else
  if (KNOWN_ROOTS.some((root) => token.startsWith(root))) return true
  return token.includes('/') && FILE_EXTENSION.test(token)
}

const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/') + 1)

function resolveRelative(from: string, target: string): string {
  const parts = (dirOf(from) + target).split('/')
  const out: string[] = []
  for (const part of parts) {
    if (part === '..') out.pop()
    else if (part !== '.' && part !== '') out.push(part)
  }
  return `/${out.join('/')}`
}

/**
 * Documents that name a file or folder that is not in the repo ("docs promising what the repo doesn't hold").
 * `docs` maps a path like "/docs/testing.md" to its text; `exists` says whether a path like "/src/model" is a file or folder.
 * Checks markdown links, and backticked paths (tried from the repo root, the document's folder and src/, because the
 * docs write `model/playback.ts` for `src/model/playback.ts`).
 */
export function findBrokenDocReferences(docs: Record<string, string>, exists: (path: string) => boolean): string[] {
  const problems: string[] = []
  for (const [docPath, text] of Object.entries(docs)) {
    const prose = text.replace(/```[\s\S]*?```/g, '') // code blocks hold examples and diagrams, not promises
    for (const m of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split('#')[0]
      if (target === '' || /^[a-z]+:/i.test(target)) continue
      if (!exists(resolveRelative(docPath, target).replace(/\/$/, ''))) problems.push(`${docPath} links to ${m[1]}, which does not exist`)
    }
    for (const m of prose.matchAll(/`([^`\n]+)`/g)) {
      const token = m[1].replace(/:\d+(-\d+)?$/, '').replace(/\/$/, '')
      if (!looksLikeRepoPath(token)) continue
      const candidates = [`/${token}`, resolveRelative(docPath, token), `/src/${token}`]
      if (!candidates.some(exists)) problems.push(`${docPath} mentions ${m[1]}, which does not exist`)
    }
  }
  return [...new Set(problems)]
}
