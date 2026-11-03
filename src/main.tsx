import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startAutosave } from './store/autosave'
import { initTheme } from './theme/theme'

// Both run before the first render so there's no flash of the wrong theme
// and no window where edits could go unsaved.
initTheme()
startAutosave()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
