import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startAutosave } from './store/autosave'
import { startHistory } from './store/history'
import { startTransport } from './store/transport'
import { initTheme } from './theme/theme'

// These run before the first render so there's no flash of the wrong theme
// and no window where edits could go unsaved.
initTheme()
startAutosave()
startHistory()
startTransport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
