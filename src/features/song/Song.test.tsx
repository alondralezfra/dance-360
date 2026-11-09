// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../../model/project'
import type { Song } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { useSong } from '../../store/songStore'
import { SongPage } from './SongPage'
import { SongSection } from './SongSection'
import { TempoSection } from './TempoSection'
import { TimelinePanel } from './TimelinePanel'

// The real drawing is covered by drawTimeline.test.ts; here we only watch what it is asked to draw.
vi.mock('./drawTimeline', () => ({ drawTimeline: vi.fn(), RULER_HEIGHT: 34 }))
const { drawTimeline } = await import('./drawTimeline')

const song: Song = { name: 'Spring Medley.mp3', durationSec: 201.4, size: 4_812_345, mime: 'audio/mpeg', hash: 'abc' }
const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement
const mp3 = () => new File(['x'], 'new.mp3', { type: 'audio/mpeg' })

beforeEach(() => {
  // (the pixel-ratio hook asks the browser about its screen; jsdom has no answer)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  useProject.setState({ ...createEmptyProject(), projectId: 'p1', status: 'ready', song: null })
  useSong.setState({ file: 'none', peaks: null, peaksHash: null, busy: false, error: null })
})

describe('SongSection', () => {
  it('invites you to attach a song when there is none, and offers nothing else', () => {
    render(<SongSection />)
    expect(screen.getByRole('button', { name: 'Attach song' })).toBeInTheDocument()
    expect(screen.getByText(/No song yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Replace song' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove song' })).toBeNull()
  })

  it('shows the song name, length and size, with replace and remove', () => {
    useProject.setState({ song })
    useSong.setState({ file: 'present' })
    render(<SongSection />)
    expect(screen.getByText('Spring Medley.mp3')).toBeInTheDocument()
    expect(screen.getByText('3:21 · 4.6 MB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace song' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove song' })).toBeInTheDocument()
    expect(screen.queryByText(/not on this device/)).toBeNull()
  })

  it('hands a chosen file to the store', async () => {
    const attach = vi.fn().mockResolvedValue(undefined)
    useSong.setState({ attach })
    const { container } = render(<SongSection />)
    const file = mp3()
    await userEvent.setup().upload(fileInput(container), file)
    expect(attach).toHaveBeenCalledExactlyOnceWith(file)
  })

  it('replacing hands the new file to the store too', async () => {
    const attach = vi.fn().mockResolvedValue(undefined)
    useProject.setState({ song })
    useSong.setState({ file: 'present', attach })
    const { container } = render(<SongSection />)
    await userEvent.setup().upload(fileInput(container), mp3())
    expect(attach).toHaveBeenCalledTimes(1)
  })

  it('shows what is happening and disables the buttons while reading a song', () => {
    useProject.setState({ song })
    useSong.setState({ file: 'present', busy: true })
    render(<SongSection />)
    expect(screen.getByRole('status')).toHaveTextContent('Reading the song')
    expect(screen.getByRole('button', { name: 'Replace song' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove song' })).toBeDisabled()
  })

  it('says it is looking for the file while it checks', () => {
    useProject.setState({ song })
    useSong.setState({ file: 'checking' })
    render(<SongSection />)
    expect(screen.getByText(/Looking for the song on this device/)).toBeInTheDocument()
  })

  describe('when the file is not on this device', () => {
    beforeEach(() => {
      useProject.setState({ song })
      useSong.setState({ file: 'missing' })
    })

    it('explains, reassures, and offers to choose the file again', () => {
      render(<SongSection />)
      expect(screen.getByText('The song file is not on this device.')).toBeInTheDocument()
      expect(screen.getByText(/formations and counts are safe/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Choose the file again' })).toBeInTheDocument()
    })

    it('gives the chosen file to the store as the same song, not a replacement', async () => {
      const reattach = vi.fn().mockResolvedValue(undefined)
      const attach = vi.fn()
      useSong.setState({ reattach, attach })
      const { container } = render(<SongSection />)
      const inputs = container.querySelectorAll('input[type="file"]')
      const again = inputs[inputs.length - 1] as HTMLInputElement // the one inside the notice
      await userEvent.setup().upload(again, mp3())
      expect(reattach).toHaveBeenCalledTimes(1)
      expect(attach).not.toHaveBeenCalled()
    })
  })

  describe('problems', () => {
    it('shows the message as an alert and lets you dismiss it', async () => {
      useSong.setState({ error: 'That file is too large.' })
      render(<SongSection />)
      expect(screen.getByRole('alert')).toHaveTextContent('That file is too large.')
      await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('removing', () => {
    beforeEach(() => {
      useProject.setState({ song })
      useSong.setState({ file: 'present' })
    })

    it('asks first, naming the song and saying what is safe', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      useSong.setState({ remove: vi.fn() })
      render(<SongSection />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Remove song' }))
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Spring Medley.mp3'))
      expect(confirm.mock.calls[0][0]).toMatch(/formations and counts are not affected/)
      confirm.mockRestore()
    })

    it('removes when confirmed, and keeps the song when not', async () => {
      const remove = vi.fn().mockResolvedValue(undefined)
      useSong.setState({ remove })
      render(<SongSection />)
      const user = userEvent.setup()
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      await user.click(screen.getByRole('button', { name: 'Remove song' }))
      expect(remove).not.toHaveBeenCalled()
      confirm.mockReturnValue(true)
      await user.click(screen.getByRole('button', { name: 'Remove song' }))
      expect(remove).toHaveBeenCalledTimes(1)
      confirm.mockRestore()
    })
  })
})

describe('TempoSection', () => {
  const tempo = () => useProject.getState().tempo

  it('shows the BPM and start point', () => {
    useProject.setState({ tempo: { bpm: 127.5, startOffsetSec: 1.25, changes: [] } })
    render(<TempoSection />)
    expect(screen.getByLabelText('BPM')).toHaveValue('127.5')
    expect(screen.getByLabelText('Start point (seconds)')).toHaveValue('1.25')
  })

  it('sets the BPM, keeping a decimal, and leaves the rest of the tempo alone', async () => {
    const user = userEvent.setup()
    render(<TempoSection />)
    const bpm = screen.getByLabelText('BPM')
    await user.clear(bpm)
    await user.type(bpm, '127.5{Enter}')
    expect(tempo()).toEqual({ bpm: 127.5, startOffsetSec: 0, changes: [] })
  })

  it('keeps the BPM within a sensible range', async () => {
    const user = userEvent.setup()
    render(<TempoSection />)
    const bpm = screen.getByLabelText('BPM')
    await user.clear(bpm)
    await user.type(bpm, '900{Enter}')
    expect(tempo().bpm).toBe(300)
    await user.clear(bpm)
    await user.type(bpm, '3{Enter}')
    expect(tempo().bpm).toBe(20)
  })

  it('sets the start point to the millisecond', async () => {
    const user = userEvent.setup()
    render(<TempoSection />)
    const start = screen.getByLabelText('Start point (seconds)')
    await user.clear(start)
    await user.type(start, '2.3456{Enter}')
    expect(tempo().startOffsetSec).toBe(2.346)
  })

  it('nudges the start point by a hundredth of a second without drifting', async () => {
    const user = userEvent.setup()
    useProject.setState({ tempo: { bpm: 120, startOffsetSec: 0.1, changes: [] } })
    render(<TempoSection />)
    await user.click(screen.getByRole('button', { name: 'Start 0.01 seconds later' }))
    expect(tempo().startOffsetSec).toBe(0.11) // not 0.11000000000000001
    await user.click(screen.getByRole('button', { name: 'Start 0.01 seconds earlier' }))
    await user.click(screen.getByRole('button', { name: 'Start 0.01 seconds earlier' }))
    expect(tempo().startOffsetSec).toBe(0.09)
  })

  it('cannot nudge the start point before the song begins', async () => {
    render(<TempoSection />)
    expect(screen.getByRole('button', { name: 'Start 0.01 seconds earlier' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start 0.01 seconds later' })).toBeEnabled()
  })
})

describe('TimelinePanel', () => {
  type Resize = (entries: { contentRect: { width: number; height: number } }[]) => void
  let resize: Resize

  beforeEach(() => {
    vi.mocked(drawTimeline).mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() } as never)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: Resize) {
          resize = cb
        }
        observe() {
          resize([{ contentRect: { width: 600, height: 190 } }])
        }
        disconnect() {}
      },
    )
    // formations at 0 and 100: the dance is 108 counts long, so it fits at about 5.6px per count
    const project = createEmptyProject()
    useProject.setState({
      formations: [project.formations[0], { ...project.formations[0], id: 'f2', count: 100 }],
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const lastView = () => vi.mocked(drawTimeline).mock.calls.at(-1)![1].view

  it('draws the whole dance to start with', () => {
    render(<TimelinePanel />)
    expect(lastView().startCount).toBe(0)
    expect(lastView().pxPerCount).toBeCloseTo(600 / 108)
  })

  it('describes itself for screen readers, with the song when there is a waveform', () => {
    useProject.setState({ song })
    useSong.setState({ file: 'present', peaks: { perSecond: 100, data: Uint8Array.from([1]) } })
    render(<TimelinePanel />)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Timeline of 2 formations over 403 counts, with the waveform of Spring Medley.mp3 (3:21).',
    )
  })

  it('describes the counts alone when there is no song', () => {
    render(<TimelinePanel />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Timeline of 2 formations over 108 counts.')
  })

  it('passes the waveform, tempo and formations to the drawing', () => {
    const peaks = { perSecond: 100, data: Uint8Array.from([5]) }
    useSong.setState({ file: 'present', peaks })
    render(<TimelinePanel />)
    const d = vi.mocked(drawTimeline).mock.calls.at(-1)![1]
    expect(d.peaks).toBe(peaks)
    expect(d.formations).toHaveLength(2)
    expect(d.tempo.bpm).toBe(120)
    expect(d.width).toBe(600)
  })

  it('zooms in and out with the buttons, and Fit brings the whole dance back', async () => {
    const user = userEvent.setup()
    render(<TimelinePanel />)
    const fitted = lastView().pxPerCount
    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(lastView().pxPerCount).toBeCloseTo(fitted * 1.5)
    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(lastView().pxPerCount).toBeCloseTo(fitted * 2.25)
    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(lastView().pxPerCount).toBeCloseTo(fitted * 1.5)
    await user.click(screen.getByRole('button', { name: 'Fit' }))
    expect(lastView().pxPerCount).toBeCloseTo(fitted)
    expect(lastView().startCount).toBe(0)
  })

  it('zooms with the mouse wheel over the timeline', () => {
    const { container } = render(<TimelinePanel />)
    const fitted = lastView().pxPerCount
    const box = container.querySelector('canvas')!.parentElement!
    act(() => void fireEvent.wheel(box, { deltaY: -200, clientX: 300 }))
    expect(lastView().pxPerCount).toBeGreaterThan(fitted)
  })

  it('shows the part of the song before count 0 when the dance starts later in the song', () => {
    useProject.setState({ tempo: { bpm: 120, startOffsetSec: 4, changes: [] } }) // 8 counts of intro
    render(<TimelinePanel />)
    expect(lastView().startCount).toBe(-8)
  })

  it('draws nothing until it knows how wide it is', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    render(<TimelinePanel />)
    expect(drawTimeline).not.toHaveBeenCalled()
  })

  it('redraws when the project changes', () => {
    render(<TimelinePanel />)
    vi.mocked(drawTimeline).mockClear()
    act(() => useProject.setState({ tempo: { bpm: 90, startOffsetSec: 0, changes: [] } }))
    expect(drawTimeline).toHaveBeenCalled()
    expect(vi.mocked(drawTimeline).mock.calls.at(-1)![1].tempo.bpm).toBe(90)
  })
})

describe('SongPage', () => {
  it('checks for the song file on arrival, and again when the song changes', () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    useSong.setState({ refresh })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    render(<SongPage />)
    expect(refresh).toHaveBeenCalledTimes(1)
    act(() => useProject.setState({ song }))
    expect(refresh).toHaveBeenCalledTimes(2)
    act(() => useProject.setState({ song: { ...song, name: 'renamed.mp3' } })) // same file: no need to look again
    expect(refresh).toHaveBeenCalledTimes(2)
    act(() => useProject.setState({ projectId: 'p2' }))
    expect(refresh).toHaveBeenCalledTimes(3)
    vi.unstubAllGlobals()
  })

  it('shows the song, tempo and timeline sections', () => {
    useSong.setState({ refresh: vi.fn().mockResolvedValue(undefined) })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    render(<SongPage />)
    for (const name of ['Song', 'Tempo', 'Timeline']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    vi.unstubAllGlobals()
  })
})
