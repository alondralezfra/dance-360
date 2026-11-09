import { audioRepository, repository } from '../persistence'
import { flush as flushAutosave } from './autosave'
import { useProject } from './projectStore'

/**
 * Removes song files from this device that no project uses any more (a song was
 * removed or replaced, or its project deleted), so they don't pile up and fill the
 * device. The check first saves any pending edit, so the saved projects reflect what
 * is on screen, and always counts the song of the project that is open right now
 * (a closed project's leftover fields don't count). Never throws:
 * cleaning up is best effort, and a file left behind is only wasted space.
 */
export async function pruneUnusedAudio(): Promise<void> {
  try {
    await flushAutosave()
    const used = await repository.songHashes()
    const { status, song } = useProject.getState()
    if (status === 'ready' && song) used.add(song.hash)
    for (const hash of await audioRepository.list()) {
      if (!used.has(hash)) await audioRepository.remove(hash)
    }
  } catch (error) {
    console.error('Could not clear unused songs', error)
  }
}
