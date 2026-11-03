// Light/dark theme switching. The theme is the data-theme attribute on <html>;
// the matching CSS variables live in src/index.css.

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'dance360:theme'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode); the theme just won't be remembered.
  }
}

/** Apply the saved theme (or the system preference). Call before the first render. */
export function initTheme() {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  document.documentElement.dataset.theme =
    saved === 'light' || saved === 'dark' ? saved : systemTheme()
}
