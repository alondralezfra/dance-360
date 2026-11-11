import { useEffect } from 'react'
import { isInteractive } from '../../lib/typing'
import { useProject } from '../../store/projectStore'
import { useTransport } from '../../store/transport'

/**
 * The Space bar plays and pauses the song, and M marks the next formation while it plays,
 * anywhere in a project. They stay out of the way wherever those keys already mean something:
 * typing, and any button, link, checkbox, slider or dropdown that has the keyboard focus.
 */
export function usePlaybackShortcut() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (e.key !== ' ' && e.key !== 'm' && e.key !== 'M') return
      if (isInteractive(e.target)) return
      if (!useProject.getState().song) return
      if (e.key === ' ') {
        e.preventDefault() // not "scroll down a page"
        void useTransport.getState().toggle()
      } else if (useTransport.getState().playing) {
        e.preventDefault()
        useTransport.getState().mark()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
