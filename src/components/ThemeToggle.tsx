import { useSyncExternalStore } from 'react'
import { getTheme, setTheme } from '../theme/theme'
import { IconButton } from './ui/IconButton'

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
    <IconButton
      variant="ghost"
      icon={theme === 'dark' ? 'sun' : 'moon'}
      label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    />
  )
}
