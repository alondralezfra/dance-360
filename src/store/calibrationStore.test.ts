// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A stand-in click-track player that the test controls.
const fake = vi.hoisted(() => ({
  onEnd: null as null | (() => void),
  result: 180 as number | null,
  taps: 0,
  start: null as unknown as ReturnType<typeof vi.fn>,
  tap: null as unknown as ReturnType<typeof vi.fn>,
  stop: null as unknown as ReturnType<typeof vi.fn>,
}))
vi.mock('../audio/calibration', () => ({
  createCalibration: () => ({
    start: (fake.start = vi.fn(async (onEnd: () => void) => void (fake.onEnd = onEnd))),
    tap: (fake.tap = vi.fn(() => void fake.taps++)),
    taps: () => fake.taps,
    result: () => fake.result,
    stop: (fake.stop = vi.fn()),
  }),
}))

const { useCalibration } = await import('./calibrationStore')
const { useSpeaker } = await import('./speakerStore')
const { useTransport } = await import('./transport')

const state = () => useCalibration.getState()

beforeEach(() => {
  localStorage.clear()
  fake.taps = 0
  fake.result = 180
  fake.start.mockClear()
  fake.tap.mockClear()
  fake.stop.mockClear()
  useCalibration.setState({ status: 'idle', taps: 0, result: null, error: null })
  useSpeaker.setState({ delayMs: 0 })
})

describe('speaker delay calibration', () => {
  it('pauses the song, starts the clicks, and listens for taps', async () => {
    const pause = vi.fn()
    useTransport.setState({ pause })
    await state().start()
    expect(pause).toHaveBeenCalled()
    expect(fake.start).toHaveBeenCalled()
    expect(state().status).toBe('listening')
    expect(state().error).toBeNull()
  })

  it('counts taps while listening, and ignores them otherwise', async () => {
    state().tap()
    expect(fake.tap).not.toHaveBeenCalled()
    await state().start()
    state().tap()
    state().tap()
    expect(state().taps).toBe(2)
  })

  it('shows the delay it found when the clicks finish', async () => {
    await state().start()
    fake.onEnd!()
    expect(state().status).toBe('done')
    expect(state().result).toBe(180)
  })

  it('says there was no result when too few taps lined up', async () => {
    fake.result = null
    await state().start()
    fake.onEnd!()
    expect(state().status).toBe('done')
    expect(state().result).toBeNull()
  })

  it('uses the delay once accepted, and finishes', async () => {
    await state().start()
    fake.onEnd!()
    state().apply()
    expect(useSpeaker.getState().delayMs).toBe(180)
    expect(state().status).toBe('idle')
    expect(fake.stop).toHaveBeenCalled()
  })

  it('does not change the delay when there is nothing to accept', async () => {
    useSpeaker.setState({ delayMs: 90 })
    fake.result = null
    await state().start()
    fake.onEnd!()
    state().apply()
    expect(useSpeaker.getState().delayMs).toBe(90)
  })

  it('can be cancelled at any point, leaving the delay as it was', async () => {
    useSpeaker.setState({ delayMs: 90 })
    await state().start()
    state().tap()
    state().cancel()
    expect(state()).toMatchObject({ status: 'idle', taps: 0, result: null })
    expect(useSpeaker.getState().delayMs).toBe(90)
    expect(fake.stop).toHaveBeenCalled()
  })

  it('cannot be started twice at once', async () => {
    await state().start()
    await state().start()
    expect(fake.start).toHaveBeenCalledTimes(1)
  })

  it('can be run again after finishing, starting fresh', async () => {
    await state().start()
    state().tap()
    fake.onEnd!()
    fake.taps = 0
    await state().start()
    expect(state()).toMatchObject({ status: 'listening', taps: 0, result: null })
  })

  describe('when the clicks cannot be played', () => {
    it('asks for another press if the browser wanted a tap first', async () => {
      fake.start.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'))
      await state().start()
      expect(state().status).toBe('idle')
      expect(state().error).toBe('The browser would not start the sound. Press Calibrate again.')
    })

    it('says so plainly for any other problem', async () => {
      fake.start.mockRejectedValueOnce(new Error('boom'))
      await state().start()
      expect(state().error).toBe('The test sound could not be played.')
    })

    it('forgets the problem on the next try', async () => {
      fake.start.mockRejectedValueOnce(new Error('boom'))
      await state().start()
      await state().start()
      expect(state().error).toBeNull()
      expect(state().status).toBe('listening')
    })
  })
})
