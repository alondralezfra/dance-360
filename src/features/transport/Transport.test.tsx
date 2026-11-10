// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '../../model/project'
import type { Song } from '../../model/types'
import { useProject } from '../../store/projectStore'
import { playheadClock, useTransport } from '../../store/transport'
import { TransportBar } from './TransportBar'
import { usePlaybackShortcut } from './usePlaybackShortcut'

const song: Song = { name: 'a.mp3', durationSec: 60, size: 1, mime: 'audio/mpeg', hash: 'h' }
const actions = () => ({
  toggle: vi.fn().mockResolvedValue(undefined),
  seek: vi.fn(),
  setMetronome: vi.fn(),
  dismissError: vi.fn(),
})

beforeEach(() => {
  useProject.setState({ ...createEmptyProject(), projectId: 'p', status: 'ready', song })
  useTransport.setState({ playing: false, loading: false, metronome: false, error: null, ...actions() })
  playheadClock.set(0)
})

describe('TransportBar', () => {
  it('shows Play when stopped and Pause while playing, and presses toggle', async () => {
    const user = userEvent.setup()
    const { toggle } = actions()
    useTransport.setState({ toggle })
    render(<TransportBar />)
    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(toggle).toHaveBeenCalledTimes(1)
    act(() => useTransport.setState({ playing: true }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull()
  })

  it('cannot play without a song, and says how to get one, but the slider still works', () => {
    useProject.setState({ song: null })
    render(<TransportBar />)
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByText(/Attach a song on the Song tab/)).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Playback position' })).toBeEnabled()
  })

  describe('compact (on the stage, where height is precious)', () => {
    it('has no card border or padding of its own, so it takes only the height of its buttons', () => {
      const { container } = render(<TransportBar compact />)
      expect(container.firstElementChild).not.toHaveClass('border', 'p-2')
      const { container: card } = render(<TransportBar />)
      expect(card.firstElementChild).toHaveClass('border', 'p-2')
    })

    it('puts the "attach a song" hint in the Play button tooltip instead of an extra line', () => {
      useProject.setState({ song: null })
      render(<TransportBar compact />)
      expect(screen.queryByText(/Attach a song on the Song tab/)).toBeNull()
      expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('title', expect.stringMatching(/Attach a song on the Song tab/))
    })

    it('still plays, and still shows the position and the metronome switch', async () => {
      const { toggle } = actions()
      useTransport.setState({ toggle })
      render(<TransportBar compact />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Play' }))
      expect(toggle).toHaveBeenCalled()
      expect(screen.getByRole('slider', { name: 'Playback position' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Click on every count' })).toBeInTheDocument()
    })
  })

  it('cannot be pressed again while the song is still being loaded', () => {
    useTransport.setState({ loading: true })
    render(<TransportBar />)
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
  })

  describe('where the song is', () => {
    it('reads out the position as set and count, and follows the playhead', () => {
      render(<TransportBar />)
      expect(screen.getByText('Set 1 · Count 1')).toBeInTheDocument()
      act(() => playheadClock.set(13.9))
      expect(screen.getByText('Set 2 · Count 6')).toBeInTheDocument()
    })

    it('says "Before Set 1" in the part of the song before the dance starts', () => {
      useProject.setState({ tempo: { bpm: 120, startOffsetSec: 4, changes: [] } })
      render(<TransportBar />)
      act(() => playheadClock.set(-3.5))
      expect(screen.getByText('Before Set 1')).toBeInTheDocument()
    })

    it('shows the same count for movement within one count, and the next when it comes', () => {
      render(<TransportBar />)
      act(() => playheadClock.set(0.2))
      act(() => playheadClock.set(0.6))
      expect(screen.getByText('Set 1 · Count 1')).toBeInTheDocument()
      act(() => playheadClock.set(1.1))
      expect(screen.getByText('Set 1 · Count 2')).toBeInTheDocument()
    })
  })

  describe('the position slider', () => {
    it('spans the dance, from the first count to the end of the song', () => {
      render(<TransportBar />)
      const slider = screen.getByRole('slider', { name: 'Playback position' })
      expect(slider).toHaveAttribute('min', '0')
      expect(slider).toHaveAttribute('max', '120') // 60 s at 120 BPM
    })

    it('includes the intro when the dance starts part-way into the song', () => {
      useProject.setState({ tempo: { bpm: 120, startOffsetSec: 4, changes: [] } })
      render(<TransportBar />)
      expect(screen.getByRole('slider')).toHaveAttribute('min', '-8')
    })

    it('shows the playhead, and describes it in words for screen readers', () => {
      render(<TransportBar />)
      act(() => playheadClock.set(20))
      const slider = screen.getByRole('slider')
      expect(slider).toHaveValue('20')
      expect(slider).toHaveAttribute('aria-valuetext', 'Set 3 · Count 5')
    })

    it('moves the playhead when dragged', () => {
      const { seek } = actions()
      useTransport.setState({ seek })
      render(<TransportBar />)
      fireEvent.change(screen.getByRole('slider'), { target: { value: '33' } })
      expect(seek).toHaveBeenCalledExactlyOnceWith(33)
    })

    it('stays on the slider if the playhead is somehow outside the range', () => {
      render(<TransportBar />)
      act(() => playheadClock.set(9999))
      expect(screen.getByRole('slider')).toHaveValue('120')
    })
  })

  it('has a metronome switch that shows and changes the setting', async () => {
    const user = userEvent.setup()
    const { setMetronome } = actions()
    useTransport.setState({ setMetronome })
    const { rerender } = render(<TransportBar />)
    const box = screen.getByRole('checkbox', { name: 'Click on every count' })
    expect(box).not.toBeChecked()
    await user.click(box)
    expect(setMetronome).toHaveBeenCalledWith(true)
    act(() => useTransport.setState({ metronome: true }))
    rerender(<TransportBar />)
    expect(screen.getByRole('checkbox', { name: 'Click on every count' })).toBeChecked()
  })

  it('shows a problem as an alert that can be dismissed', async () => {
    const { dismissError } = actions()
    useTransport.setState({ error: 'The song file is not on this device.', dismissError })
    render(<TransportBar />)
    expect(screen.getByRole('alert')).toHaveTextContent('not on this device')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(dismissError).toHaveBeenCalledTimes(1)
  })
})

describe('usePlaybackShortcut', () => {
  function Page() {
    usePlaybackShortcut()
    return (
      <div>
        <p data-testid="plain">text</p>
        <button>A button</button>
        <input aria-label="A text box" />
        <input type="checkbox" aria-label="A checkbox" />
        <input type="range" aria-label="A slider" />
      </div>
    )
  }
  const space = (target: Element | Window = window, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(target, { key: ' ', ...init })

  it('plays and pauses on Space, and keeps the page from scrolling', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    render(<Page />)
    expect(space()).toBe(false) // default prevented
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('works from anywhere that is not a control', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    render(<Page />)
    space(screen.getByTestId('plain'))
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('leaves Space alone where it already means something', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    render(<Page />)
    for (const target of [
      screen.getByRole('button', { name: 'A button' }),
      screen.getByLabelText('A text box'),
      screen.getByLabelText('A checkbox'),
      screen.getByLabelText('A slider'),
    ]) {
      expect(space(target)).toBe(true) // not prevented
    }
    expect(toggle).not.toHaveBeenCalled()
  })

  it('ignores Space with a modifier, and key repeat (a held key must not flip it back and forth)', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    render(<Page />)
    space(window, { ctrlKey: true })
    space(window, { metaKey: true })
    space(window, { altKey: true })
    space(window, { shiftKey: true })
    space(window, { repeat: true })
    expect(toggle).not.toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    render(<Page />)
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'a' })
    expect(toggle).not.toHaveBeenCalled()
  })

  it('does nothing, and leaves Space to the browser, when there is no song', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    useProject.setState({ song: null })
    render(<Page />)
    expect(space()).toBe(true)
    expect(toggle).not.toHaveBeenCalled()
  })

  it('stops listening when removed', () => {
    const { toggle } = actions()
    useTransport.setState({ toggle })
    const { unmount } = render(<Page />)
    unmount()
    space()
    expect(toggle).not.toHaveBeenCalled()
  })
})
