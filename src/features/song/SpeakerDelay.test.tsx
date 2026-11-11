// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalibration } from '../../store/calibrationStore'
import { useSpeaker } from '../../store/speakerStore'
import { SpeakerDelaySection } from './SpeakerDelaySection'

const actions = () => ({ start: vi.fn().mockResolvedValue(undefined), tap: vi.fn(), apply: vi.fn(), cancel: vi.fn() })

beforeEach(() => {
  localStorage.clear()
  useSpeaker.setState({ delayMs: 0 })
  useCalibration.setState({ status: 'idle', taps: 0, result: null, error: null, ...actions() })
})

describe('SpeakerDelaySection', () => {
  it('shows the delay and lets you type another, kept as a whole number within its limits', async () => {
    const user = userEvent.setup()
    useSpeaker.setState({ delayMs: 180 })
    render(<SpeakerDelaySection />)
    expect(screen.getByLabelText('Delay (ms)')).toHaveValue('180')
    expect(screen.getByText('The sound is 180 ms late.')).toBeInTheDocument()
    const box = screen.getByLabelText('Delay (ms)')
    await user.clear(box)
    await user.type(box, '240{Enter}')
    expect(useSpeaker.getState().delayMs).toBe(240)
    await user.clear(box)
    await user.type(box, '99999{Enter}')
    expect(useSpeaker.getState().delayMs).toBe(1000)
  })

  it('says what no delay means', () => {
    render(<SpeakerDelaySection />)
    expect(screen.getByText(/No delay: wired speakers and headphones/)).toBeInTheDocument()
  })

  it('starts a measurement from the Calibrate button', async () => {
    const user = userEvent.setup()
    const { start } = actions()
    useCalibration.setState({ start })
    render(<SpeakerDelaySection />)
    await user.click(screen.getByRole('button', { name: 'Calibrate by tapping' }))
    expect(start).toHaveBeenCalledTimes(1)
  })

  describe('while measuring', () => {
    it('waits for the clicks to start, with nothing to tap yet', () => {
      useCalibration.setState({ status: 'starting' })
      render(<SpeakerDelaySection />)
      expect(screen.getByText('Starting the clicks…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Tap on each click' })).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Calibrate by tapping' })).toBeNull()
    })

    it('notes a tap the moment the button is pressed down', () => {
      const { tap } = actions()
      useCalibration.setState({ status: 'listening', tap })
      render(<SpeakerDelaySection />)
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Tap on each click' }))
      expect(tap).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Tap on each click' }), { detail: 1 }) // the click that follows a press: not a second tap
      expect(tap).toHaveBeenCalledTimes(1)
    })

    it('also works from the keyboard (a key press makes a click with no pointer)', () => {
      const { tap } = actions()
      useCalibration.setState({ status: 'listening', tap })
      render(<SpeakerDelaySection />)
      fireEvent.click(screen.getByRole('button', { name: 'Tap on each click' }), { detail: 0 })
      expect(tap).toHaveBeenCalledTimes(1)
    })

    it('counts the taps, in the singular and the plural', () => {
      useCalibration.setState({ status: 'listening', taps: 1 })
      const { rerender } = render(<SpeakerDelaySection />)
      expect(screen.getByText('1 tap so far')).toBeInTheDocument()
      act(() => useCalibration.setState({ taps: 5 }))
      rerender(<SpeakerDelaySection />)
      expect(screen.getByText('5 taps so far')).toBeInTheDocument()
    })

    it('can be cancelled', async () => {
      const { cancel } = actions()
      useCalibration.setState({ status: 'listening', cancel })
      render(<SpeakerDelaySection />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))
      expect(cancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the clicks have finished', () => {
    it('offers the delay it found, to use or to try again', async () => {
      const user = userEvent.setup()
      const { apply, start } = actions()
      useCalibration.setState({ status: 'done', result: 210, apply, start })
      render(<SpeakerDelaySection />)
      expect(screen.getByRole('status')).toHaveTextContent('Your sound is about 210 ms late.')
      await user.click(screen.getByRole('button', { name: 'Use 210 ms' }))
      expect(apply).toHaveBeenCalledTimes(1)
      await user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(start).toHaveBeenCalledTimes(1)
    })

    it('says so when too few taps lined up, offering only to try again or cancel', () => {
      useCalibration.setState({ status: 'done', result: null })
      render(<SpeakerDelaySection />)
      expect(screen.getByRole('status')).toHaveTextContent('Not enough of your taps lined up with the clicks')
      expect(screen.queryByRole('button', { name: /^Use / })).toBeNull()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  it('shows a problem as an alert', () => {
    useCalibration.setState({ error: 'The test sound could not be played.' })
    render(<SpeakerDelaySection />)
    expect(screen.getByRole('alert')).toHaveTextContent('The test sound could not be played.')
  })

  it('ends a measurement in progress when the page is left', () => {
    const { cancel } = actions()
    useCalibration.setState({ status: 'listening', cancel })
    const { unmount } = render(<SpeakerDelaySection />)
    unmount()
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
