// Asking the browser not to clear this site's data when the device runs low on space. Without it a
// browser may evict projects and songs it considers expendable (Safari notably does after a spell of
// not visiting). Some browsers grant it quietly, some ask the person, some refuse: all are fine,
// the request only improves the odds. Backup files (projectFile.ts) are the real safeguard.

/** Asks once for persistent storage; true if the site now has it. Never throws, and does nothing where it is unsupported. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = navigator.storage
    if (!storage?.persist) return false
    if (storage.persisted && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}
