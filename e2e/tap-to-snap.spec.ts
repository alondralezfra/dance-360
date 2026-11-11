import { expect as baseExpect, test, type Page } from '@playwright/test'
import { countToX, fitView, timelineBounds } from '../src/model/timeline'
import { beatsWav, chooseFile, createProject, goToSong, goToStage, savedProject, waitForSaved } from './helpers'

// Starting audio can take several seconds on a busy machine (a CI runner, or this suite running in parallel):
// give the page longer than the default 5 s to show that it has.
const expect = baseExpect.configure({ timeout: 15_000 })

// Placing formations on the song: tapping Mark while it plays, dragging markers on the timeline, and the
// speaker delay that lines taps up with what is heard. Real audio, played by the real browser. The song is
// made-up music at 120 BPM (two counts a second) whose first beat is at 0.5 s.

const slider = (page: Page) => page.getByRole('slider', { name: 'Playback position' })
const position = async (page: Page) => Number(await slider(page).inputValue())
const playButton = (page: Page) => page.getByRole('button', { name: 'Play', exact: true })
const pauseButton = (page: Page) => page.getByRole('button', { name: 'Pause', exact: true })
const markButton = (page: Page) => page.getByRole('button', { name: 'Mark', exact: true })
const counts = async (page: Page) => (await savedProject(page)).formations.map((f: { count: number }) => f.count) as number[]

async function attachSong(page: Page) {
  await chooseFile(page, beatsWav({ bpm: 120, seconds: 40, firstBeatSec: 0.5 }, 'Groove.wav'))
  await page.getByRole('region', { name: 'Tempo' }).getByRole('status').waitFor({ timeout: 25_000 })
}

/** Where a formation lands, typed into its Set field (Count stays 1), so counts are far apart and a slow runner cannot reach the next one. */
async function landOnSet(page: Page, set: number) {
  const box = page.getByLabel('Set', { exact: true })
  await box.fill(String(set))
  await box.press('Enter')
}

/** A project with a song and formations at counts 0, 32 and 64, on the Stage. */
async function setUp(page: Page) {
  await createProject(page)
  await goToSong(page)
  await attachSong(page)
  await goToStage(page)
  await page.getByRole('button', { name: '+ New formation' }).click()
  await page.getByRole('button', { name: '+ New formation' }).click()
  await landOnSet(page, 9) // Formation 3 at count 64
  await page.getByRole('button', { name: 'Previous formation' }).click()
  await landOnSet(page, 5) // Formation 2 at count 32
  await expect.poll(() => counts(page)).toEqual([0, 32, 64])
  await page.getByRole('button', { name: 'Previous formation' }).click() // back at Formation 1, which is where the song starts
  await atStart(page)
}

/** Stepping to a formation previews the step, gliding the playhead there; wait for it to arrive before playing. */
async function atStart(page: Page) {
  await expect.poll(() => position(page)).toBe(0)
}

/** Play, and wait until the song is a few counts in (so a tap lands well after the start but long before the next formation). */
async function playToCount(page: Page, count: number) {
  await playButton(page).click()
  await expect(pauseButton(page)).toBeVisible()
  await expect.poll(() => position(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(count)
}

test.describe('tap-to-snap: Mark while the song plays', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('puts the next formation on the count being heard', async ({ page }) => {
    await setUp(page)
    await playToCount(page, 4)
    const before = await position(page)
    await markButton(page).click()
    const after = await position(page)
    await expect.poll(async () => (await counts(page))[1]).not.toBe(32)
    const [first, placed, third] = await counts(page)
    expect(first).toBe(0)
    expect(placed).toBeGreaterThanOrEqual(before)
    expect(placed).toBeLessThanOrEqual(after + 1)
    expect(third).toBe(64) // the formation after it is untouched
  })

  test('each tap places the next formation, and says what it did', async ({ page }) => {
    await setUp(page)
    await playToCount(page, 3)
    await markButton(page).click()
    await expect.poll(async () => (await counts(page))[1]).toBeLessThan(32)
    await expect.poll(() => position(page)).toBeGreaterThanOrEqual((await counts(page))[1] + 2)
    await markButton(page).click()
    await expect.poll(async () => (await counts(page))[2]).toBeLessThan(64)
    const [, second, third] = await counts(page)
    expect(third).toBeGreaterThan(second)
    await expect(page.getByRole('status').filter({ hasText: /^Formation 3 placed at Set/ })).toHaveCount(1)
  })

  test('the M key does the same, when no control has the focus', async ({ page }) => {
    await setUp(page)
    await playToCount(page, 4)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('m')
    await expect.poll(async () => (await counts(page))[1]).toBeLessThan(32)
  })

  test('the whole take of taps is one undo step', async ({ page }) => {
    await setUp(page)
    await playToCount(page, 3)
    await markButton(page).click()
    await expect.poll(async () => (await counts(page))[1]).toBeLessThan(32)
    await expect.poll(() => position(page)).toBeGreaterThanOrEqual((await counts(page))[1] + 2)
    await markButton(page).click()
    await expect.poll(async () => (await counts(page))[2]).toBeLessThan(64)
    await pauseButton(page).click()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => counts(page)).toEqual([0, 32, 64])
  })

  test('is switched off when the song is not playing, and says when there is nothing left to place', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await attachSong(page)
    await goToStage(page)
    await expect(markButton(page)).toBeDisabled()
    await page.getByRole('button', { name: '+ New formation' }).click() // Formation 2, at count 8
    await landOnSet(page, 5) // count 32, so the song cannot reach it during the test
    await page.getByRole('button', { name: 'Previous formation' }).click() // back at Formation 1, where the song starts
    await expect.poll(() => counts(page)).toEqual([0, 32])
    await atStart(page)
    await playToCount(page, 2)
    await markButton(page).click()
    await expect.poll(async () => (await counts(page))[1]).toBeLessThan(32)
    await markButton(page).click() // the only formation after the first is already placed
    await expect(page.getByRole('status').filter({ hasText: /has been placed/ })).toHaveCount(1)
    expect((await counts(page)).length).toBe(2)
  })

  test('keeps the dancers where they are: only when the formation lands changes', async ({ page }) => {
    await setUp(page)
    const before = (await savedProject(page)).formations.map((f: { positions: unknown }) => f.positions)
    await playToCount(page, 4)
    await markButton(page).click()
    await expect.poll(async () => (await counts(page))[1]).toBeLessThan(32)
    expect((await savedProject(page)).formations.map((f: { positions: unknown }) => f.positions)).toEqual(before)
  })
})

test.describe('dragging formation markers on the timeline', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  /** Where a count is on the timeline canvas, in page pixels (the timeline starts out fitted to the whole dance). */
  async function timelinePoint(page: Page, count: number) {
    const project = await savedProject(page)
    const canvas = page.getByRole('img', { name: /^Timeline of/ })
    await canvas.scrollIntoViewIfNeeded() // a click below the visible window goes nowhere
    const box = (await canvas.boundingBox())!
    const width = Math.floor(box.width)
    const view = fitView(width, timelineBounds(project.formations, project.song, project.tempo))
    return { x: box.x + countToX(count, view), y: box.y + box.height * 0.6 }
  }

  async function drag(page: Page, from: number, to: number) {
    const start = await timelinePoint(page, from)
    const end = await timelinePoint(page, to)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 8 })
    await page.mouse.up()
  }

  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: '+ New formation' }).click() // counts 0 and 8
    await waitForSaved(page)
    await goToSong(page)
    await expect(page.getByRole('img', { name: /^Timeline of 2 formations/ })).toBeVisible()
  })

  test('dragging a marker moves that formation to the count it is let go on', async ({ page }) => {
    await drag(page, 8, 16)
    await expect.poll(() => counts(page)).toEqual([0, 16])
  })

  test('a drag is one undo step, and the formation is not saved until it is let go', async ({ page }) => {
    const start = await timelinePoint(page, 8)
    const mid = await timelinePoint(page, 14)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(mid.x, mid.y, { steps: 8 })
    await page.waitForTimeout(700) // longer than autosave takes
    expect(await counts(page)).toEqual([0, 8])
    await page.mouse.up()
    await expect.poll(() => counts(page)).toEqual([0, 14])
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => counts(page)).toEqual([0, 8])
  })

  test('cannot be dragged on or before the formation before it', async ({ page }) => {
    await drag(page, 8, 0)
    await expect.poll(() => counts(page)).toEqual([0, 1])
  })

  test('a press away from every marker still scrolls the timeline, not a formation', async ({ page }) => {
    const empty = await timelinePoint(page, 4)
    await page.mouse.move(empty.x, empty.y)
    await page.mouse.down()
    await page.mouse.move(empty.x + 40, empty.y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(700)
    expect(await counts(page)).toEqual([0, 8])
  })
})

test.describe('speaker delay', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('is typed in, kept on this device, and survives a reload', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    const box = page.getByLabel('Delay (ms)')
    await expect(box).toHaveValue('0')
    await box.fill('220')
    await box.press('Enter')
    await expect(page.getByText('The sound is 220 ms late.')).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dance360:device-preferences')!).speakerDelayMs)).toBe(220)
    await page.reload()
    await expect(page.getByLabel('Delay (ms)')).toHaveValue('220')
    // it belongs to the device, not the project: nothing about it is in the saved project
    // (checked by name: the project's random ids can contain any run of digits)
    expect(JSON.stringify(await savedProject(page)).toLowerCase()).not.toContain('speaker')
  })

  test('calibrating plays the clicks, counts the taps, and can be cancelled', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await page.getByRole('button', { name: 'Calibrate by tapping' }).click()
    const tap = page.getByRole('button', { name: 'Tap on each click' })
    await expect(tap).toBeEnabled()
    await tap.click()
    await tap.click()
    await tap.click()
    await expect(page.getByText('3 taps so far')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Calibrate by tapping' })).toBeVisible()
    await expect(page.getByLabel('Delay (ms)')).toHaveValue('0') // nothing changed
  })

  test('plays all the way through, then says when too few taps lined up, changing nothing', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await page.getByRole('button', { name: 'Calibrate by tapping' }).click()
    await page.getByRole('button', { name: 'Tap on each click' }).click()
    await expect(page.getByRole('status').filter({ hasText: /Not enough of your taps/ })).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByLabel('Delay (ms)')).toHaveValue('0')
  })
})
