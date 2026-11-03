import { useSyncExternalStore } from 'react'
import { getTheme, setTheme } from '../theme/theme'
import { Button } from './ui/Button'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme)
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </Button>
  )
}
