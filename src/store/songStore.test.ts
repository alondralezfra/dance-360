// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sha256Hex } from '../lib/hash'
import { createEmptyProject } from '../model/project'
import type { Song } from '../model/types'
import type { SyncSource } from '../persistence/repository'

// Real in-memory stand-ins for the storage, and a fake decoder (no audio engine in jsdom).
vi.mock('../persistence', async () => {
  const { createMemoryAudioRepository } = await import('../persistence/memoryAudioRepository')
  const { createRepository } = await import('../persistence/createRepository')
  const { createMemoryRecordStore } = await import('../persistence/memoryRecordStore')
  return { audioRepository: createMemoryAudioRepository(), repository: createRepository(createMemoryRecordStore()) }
})
vi.mock('../audio/analyze', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../audio/analyze')>()
  return { ...actual, analyzeAudio: vi.fn() }
})

const { audioRepository, repository } = await import('../persistence')
// (the stand-in repository also implements the sync interface; tests use it to arrange state)
const sync = repository as unknown as SyncSource
const { analyzeAudio, UnreadableAudioError } = await import('../audio/analyze')
const { useProject } = await import('./projectStore')
const { isAudioFile, MAX_SONG_BYTES, useSong } = await import('./songStore')
const { selectDocument } = await import('./storeTypes')

const analysis = { durationSec: 12.5, peaks: { perSecond: 100, data: Uint8Array.from([10, 200, 90]) } }
const mp3 = (content = 'song-bytes', name = 'Track.mp3') => new File([content], name, { type: 'audio/mpeg' })
const hashOf = (content: string) => sha256Hex(new TextEncoder().encode(content).buffer as ArrayBuffer)
const stored = () => audioRepository.list()
const song = () => useProject.getState().song
const openProject = (id: string) =>
  useProject.setState({ ...createEmptyProject(), projectId: id, status: 'ready', song: null })

beforeEach(async () => {
  vi.mocked(analyzeAudio).mockReset().mockResolvedValue(analysis)
  for (const hash of await audioRepository.list()) await audioRepository.remove(hash)
  for (const record of await sync.listSyncRecords()) await sync.purge(record.id)
  openProject('p1')
  useSong.setState({ file: 'none', peaks: null, peaksHash: null, busy: false, error: null })
})

describe('isAudioFile', () => {
  it('accepts audio types, and files with a blank type but an audio extension', () => {
    expect(isAudioFile(new File([''], 'a.bin', { type: 'audio/ogg' }))).toBe(true)
    for (const name of ['a.mp3', 'a.M4A', 'a.wav', 'a.flac', 'a.opus', 'a.ogg']) {
      expect(isAudioFile(new File([''], name))).toBe(true)
    }
  })

  it('rejects everything else', () => {
    expect(isAudioFile(new File([''], 'notes.txt', { type: 'text/plain' }))).toBe(false)
    expect(isAudioFile(new File([''], 'photo.png', { type: 'image/png' }))).toBe(false)
    expect(isAudioFile(new File([''], 'mp3'))).toBe(false)
  })
})

describe('attaching a song', () => {
  it('keeps the file and its peaks, records the song on the project, and is ready', async () => {
    const hash = await hashOf('song-bytes')
    await useSong.getState().attach(mp3('song-bytes', 'Spring Medley.mp3'))

    expect(song()).toEqual({
      name: 'Spring Medley.mp3',
      durationSec: 12.5,
      size: 10,
      mime: 'audio/mpeg',
      hash,
    })
    expect(await stored()).toEqual([hash])
    expect(Array.from((await audioRepository.getPeaks(hash))!.data)).toEqual([10, 200, 90])
    expect(useSong.getState()).toMatchObject({ file: 'present', busy: false, error: null })
    expect(Array.from(useSong.getState().peaks!.data)).toEqual([10, 200, 90])
  })

  it('is busy while it works', async () => {
    let finish!: (value: typeof analysis) => void
    vi.mocked(analyzeAudio).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const pending = useSong.getState().attach(mp3())
    await vi.waitFor(() => expect(useSong.getState().busy).toBe(true))
    finish(analysis)
    await pending
    expect(useSong.getState().busy).toBe(false)
  })

  it('analyses a copy, so the bytes used for the hash are not the ones the decoder empties', async () => {
    await useSong.getState().attach(mp3())
    const given = vi.mocked(analyzeAudio).mock.calls[0][0]
    expect(given.byteLength).toBe(10)
  })

  it('accepts a file with a blank type by its name, and falls back to a generic type', async () => {
    await useSong.getState().attach(new File(['x'], 'track.wav'))
    expect(song()?.mime).toBe('application/octet-stream')
  })

  it('refuses something that is not audio, and changes nothing', async () => {
    await useSong.getState().attach(new File(['hi'], 'notes.txt', { type: 'text/plain' }))
    expect(useSong.getState().error).toMatch(/does not look like an audio file/)
    expect(song()).toBeNull()
    expect(await stored()).toEqual([])
    expect(analyzeAudio).not.toHaveBeenCalled()
  })

  it('refuses a file that is too large', async () => {
    const huge = mp3()
    Object.defineProperty(huge, 'size', { value: MAX_SONG_BYTES + 1 })
    await useSong.getState().attach(huge)
    expect(useSong.getState().error).toMatch(/too large/)
    expect(song()).toBeNull()
  })

  it('says so when the file cannot be read as audio, and stores nothing', async () => {
    vi.mocked(analyzeAudio).mockRejectedValue(new UnreadableAudioError())
    await useSong.getState().attach(mp3())
    expect(useSong.getState().error).toMatch(/could not be read as audio.*MP3, M4A, WAV or OGG/)
    expect(song()).toBeNull()
    expect(await stored()).toEqual([])
    expect(useSong.getState().busy).toBe(false)
  })

  it('says so when the device is out of space, and does not set the song', async () => {
    vi.spyOn(audioRepository, 'put').mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))
    await useSong.getState().attach(mp3())
    expect(useSong.getState().error).toMatch(/not enough space/)
    expect(song()).toBeNull()
  })

  it('gives a plain message for anything unexpected, and logs the detail', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(analyzeAudio).mockRejectedValue(new Error('boom'))
    await useSong.getState().attach(mp3())
    expect(useSong.getState().error).toBe('Something went wrong with the song. Please try again.')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('clears an earlier error when the next attempt starts', async () => {
    await useSong.getState().attach(new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(useSong.getState().error).not.toBeNull()
    await useSong.getState().attach(mp3())
    expect(useSong.getState().error).toBeNull()
  })

  it('dismissError clears the message', async () => {
    useSong.setState({ error: 'oops' })
    useSong.getState().dismissError()
    expect(useSong.getState().error).toBeNull()
  })

  it('does not set the song if another project was opened while it worked', async () => {
    let finish!: (value: typeof analysis) => void
    vi.mocked(analyzeAudio).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const pending = useSong.getState().attach(mp3())
    await vi.waitFor(() => expect(useSong.getState().busy).toBe(true))
    openProject('p2')
    finish(analysis)
    await pending
    expect(song()).toBeNull()
    expect(useSong.getState().file).toBe('none')
  })
})

describe('replacing and removing the song', () => {
  it('replacing keeps the new file and clears the old one when nothing else uses it', async () => {
    const first = await hashOf('first')
    const second = await hashOf('second')
    await useSong.getState().attach(mp3('first', 'one.mp3'))
    await useSong.getState().attach(mp3('second', 'two.mp3'))
    expect(song()?.name).toBe('two.mp3')
    expect(await stored()).toEqual([second])
    expect(await audioRepository.has(first)).toBe(false)
  })

  it('keeps the old file when another project still uses it', async () => {
    const first = await hashOf('first')
    await useSong.getState().attach(mp3('first', 'one.mp3'))
    // another saved project shares that song
    const shared: Song = { name: 'one.mp3', durationSec: 12.5, size: 5, mime: 'audio/mpeg', hash: first }
    await repository.create({ ...createEmptyProject('Other'), song: shared })

    await useSong.getState().attach(mp3('second', 'two.mp3'))
    expect((await stored()).sort()).toEqual([first, await hashOf('second')].sort())
  })

  it('removing takes the song off the project and clears its file', async () => {
    await useSong.getState().attach(mp3())
    await useSong.getState().remove()
    expect(song()).toBeNull()
    expect(useSong.getState()).toMatchObject({ file: 'none', peaks: null, error: null })
    expect(await stored()).toEqual([])
  })

  it('removing when there is no song is harmless', async () => {
    await expect(useSong.getState().remove()).resolves.toBeUndefined()
    expect(song()).toBeNull()
  })
})

describe('refresh: is the file on this device?', () => {
  const withSong = async (content = 'song-bytes') => {
    const hash = await hashOf(content)
    const s: Song = { name: 'Track.mp3', durationSec: 12.5, size: 10, mime: 'audio/mpeg', hash }
    useProject.setState({ song: s })
    return hash
  }

  it('is "none" for a project without a song', async () => {
    await useSong.getState().refresh()
    expect(useSong.getState()).toMatchObject({ file: 'none', peaks: null })
  })

  it('is ready with the cached peaks when the file is here', async () => {
    const hash = await withSong()
    await audioRepository.put(hash, mp3())
    await audioRepository.putPeaks(hash, analysis.peaks)
    await useSong.getState().refresh()
    expect(useSong.getState().file).toBe('present')
    expect(Array.from(useSong.getState().peaks!.data)).toEqual([10, 200, 90])
    expect(analyzeAudio).not.toHaveBeenCalled() // the cache was enough
  })

  it('works the peaks out again, and caches them, when only the file survived', async () => {
    const hash = await withSong()
    await audioRepository.put(hash, mp3())
    await useSong.getState().refresh()
    expect(analyzeAudio).toHaveBeenCalledTimes(1)
    expect(useSong.getState().file).toBe('present')
    expect(await audioRepository.getPeaks(hash)).not.toBeNull()
  })

  it("keeps showing the same song's waveform while it checks, so the tab does not flicker", async () => {
    const hash = await withSong()
    await audioRepository.put(hash, mp3())
    await audioRepository.putPeaks(hash, analysis.peaks)
    await useSong.getState().refresh()
    let during: string | null = null
    const stop = useSong.subscribe((s) => {
      if (s.file === 'checking') during = 'flickered'
    })
    await useSong.getState().refresh()
    stop()
    expect(during).toBeNull()
    expect(useSong.getState()).toMatchObject({ file: 'present', peaksHash: hash })
  })

  it("never shows another song's waveform for this project", async () => {
    useSong.setState({ file: 'present', peaks: analysis.peaks, peaksHash: 'some-other-song' })
    await withSong()
    const pending = useSong.getState().refresh()
    expect(useSong.getState().peaks).toBeNull() // cleared straight away
    await pending
    expect(useSong.getState().file).toBe('missing')
  })

  it('is "missing" when the project has a song but this device does not have the file', async () => {
    await withSong()
    await useSong.getState().refresh()
    expect(useSong.getState()).toMatchObject({ file: 'missing', peaks: null, error: null })
  })

  it('is "missing", with a message, when the stored file cannot be read back', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const hash = await withSong()
    await audioRepository.put(hash, mp3())
    vi.mocked(analyzeAudio).mockRejectedValue(new UnreadableAudioError())
    await useSong.getState().refresh()
    expect(useSong.getState().file).toBe('missing')
    expect(useSong.getState().error).toMatch(/could not be read as audio/)
    log.mockRestore()
  })

  it('only the latest refresh counts when the song changes while one is still working', async () => {
    const slowHash = await withSong('slow')
    await audioRepository.put(slowHash, mp3('slow'))
    let release!: () => void
    const realGet = audioRepository.get.bind(audioRepository)
    vi.spyOn(audioRepository, 'get').mockImplementationOnce(async (hash) => {
      await new Promise<void>((resolve) => (release = resolve))
      return realGet(hash)
    })
    const stale = useSong.getState().refresh() // waits inside get()

    useProject.setState({ song: null }) // the song was removed meanwhile
    await useSong.getState().refresh()
    expect(useSong.getState().file).toBe('none')

    release()
    await stale
    expect(useSong.getState().file).toBe('none') // the stale result was ignored
  })
})

describe('giving a song its file again', () => {
  it('accepts the same file and makes the song ready, leaving the project untouched', async () => {
    const hash = await hashOf('song-bytes')
    const s: Song = { name: 'Track.mp3', durationSec: 99, size: 10, mime: 'audio/mpeg', hash }
    useProject.setState({ song: s })
    useSong.setState({ file: 'missing' })

    await useSong.getState().reattach(mp3('song-bytes', 'renamed copy.mp3'))
    expect(useSong.getState()).toMatchObject({ file: 'present', error: null })
    expect(song()).toEqual(s) // name and duration as the project had them
    expect(await audioRepository.has(hash)).toBe(true)
  })

  it('refuses a different file and says why', async () => {
    const s: Song = { name: 'Track.mp3', durationSec: 12.5, size: 10, mime: 'audio/mpeg', hash: await hashOf('original') }
    useProject.setState({ song: s })
    useSong.setState({ file: 'missing' })

    await useSong.getState().reattach(mp3('something else'))
    expect(useSong.getState().file).toBe('missing')
    expect(useSong.getState().error).toMatch(/not the same file/)
    expect(await stored()).toEqual([])
  })

  it('does nothing when the project has no song', async () => {
    await useSong.getState().reattach(mp3())
    expect(await stored()).toEqual([])
    expect(useSong.getState().busy).toBe(false)
  })

  it('refuses something that is not audio', async () => {
    useProject.setState({ song: { name: 'a', durationSec: 1, size: 1, mime: 'audio/mpeg', hash: 'h' } })
    await useSong.getState().reattach(new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(useSong.getState().error).toMatch(/does not look like an audio file/)
  })
})

describe('the saved document', () => {
  it('holds the song details but never the file', async () => {
    await useSong.getState().attach(mp3())
    const document = JSON.stringify(selectDocument(useProject.getState()))
    expect(document).toContain('Track.mp3')
    expect(document).not.toContain('song-bytes')
  })
})
