import { useEffect } from 'react'
import { isInteractive } from '../../lib/typing'
import { useProject } from '../../store/projectStore'
import { useTransport } from '../../store/transport'

/**
 * The Space bar plays and pauses the song, anywhere in a project. It stays out of the
 * way wherever Space already means something: typing, and any button, link, checkbox,
 * slider or dropdown that has the keyboard focus.
 */
export function usePlaybackShortcut() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (isInteractive(e.target)) return
      if (!useProject.getState().song) return
      e.preventDefault() // not "scroll down a page"
      void useTransport.getState().toggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
