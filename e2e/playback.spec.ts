import { expect as baseExpect, test, type Page } from '@playwright/test'
import {
  addDancer,
  beatsWav,
  chooseFile,
  createProject,
  dotColor,
  expectDotColor,
  goToSong,
  goToStage,
  rgb,
  savedProject,
  stagePixel,
  timelineImage,
  waitForSaved,
  wavFile,
} from './helpers'

// Starting audio can take several seconds on a busy machine (a CI runner, or this suite running in parallel):
// give the page longer than the default 5 s to show that it has.
const expect = baseExpect.configure({ timeout: 15_000 })

// Real audio, played by the real browser. The song is made-up music at 120 BPM (two counts a second) whose
// first beat is at 0.5 s, so the tempo estimate fills in 120 BPM and a start point of about 0.5 s, and
// count n lands at about 0.5 + n / 2 seconds into the song.
const song = (seconds = 30) => beatsWav({ bpm: 120, seconds, firstBeatSec: 0.5 }, 'Groove.wav')

const slider = (page: Page) => page.getByRole('slider', { name: 'Playback position' })
const position = async (page: Page) => Number(await slider(page).inputValue())
const playButton = (page: Page) => page.getByRole('button', { name: 'Play', exact: true })
const pauseButton = (page: Page) => page.getByRole('button', { name: 'Pause', exact: true })

/** Attach the song and wait for the tempo estimate (so the counts line up with the music). */
async function attachSong(page: Page, seconds = 30) {
  await chooseFile(page, song(seconds))
  await page.getByRole('region', { name: 'Tempo' }).getByRole('status').waitFor({ timeout: 25_000 })
}

test.describe('playing the song', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await goToSong(page)
  })

  test('cannot play without a song, and says how to get one, but the slider still works', async ({ page }) => {
    await expect(playButton(page)).toBeDisabled()
    await expect(page.getByText(/Attach a song on the Song tab/)).toBeVisible()
    await slider(page).fill('5')
    await expect(page.getByText('Set 1 · Count 6')).toBeVisible()
  })

  test('plays: the position moves with the music, and Pause stops it where it is', async ({ page }) => {
    await attachSong(page)
    expect(await position(page)).toBe(0)

    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await expect.poll(() => position(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(4)

    await pauseButton(page).click()
    await expect(playButton(page)).toBeVisible()
    const stopped = await position(page)
    await page.waitForTimeout(900)
    expect(await position(page)).toBe(stopped) // not moving any more
    expect(stopped).toBeGreaterThanOrEqual(4)
  })

  test('is in time with the music: the playhead moves at the tempo, two counts a second at 120 BPM', async ({ page }) => {
    await attachSong(page)
    await playButton(page).click()
    await expect.poll(() => position(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(2) // it has started (how long that takes varies)
    const from = { count: await position(page), at: Date.now() }
    await page.waitForTimeout(3000)
    const to = { count: await position(page), at: Date.now() }
    await pauseButton(page).click()
    const countsPerSecond = (to.count - from.count) / ((to.at - from.at) / 1000)
    expect(countsPerSecond).toBeGreaterThan(1.6) // (the slider shows whole counts, so allow one count either way)
    expect(countsPerSecond).toBeLessThan(2.4)
  })

  test('the timeline playhead moves while playing and stays put when paused', async ({ page }) => {
    await attachSong(page)
    const still = await timelineImage(page)
    await playButton(page).click()
    await expect.poll(() => timelineImage(page), { timeout: 20_000 }).not.toBe(still)
    await pauseButton(page).click()
    const paused = await timelineImage(page)
    await page.waitForTimeout(700)
    expect(await timelineImage(page)).toBe(paused)
  })

  test('the Space bar plays and pauses, except where Space already does something', async ({ page }) => {
    await attachSong(page)
    await page.getByRole('heading', { name: 'Timeline' }).click() // nothing focused that uses Space
    await page.keyboard.press('Space')
    await expect(pauseButton(page)).toBeVisible()
    await page.keyboard.press('Space')
    await expect(playButton(page)).toBeVisible()

    // in a text box, Space types a space instead
    const start = page.getByLabel('Start point (seconds)')
    await start.focus()
    await page.keyboard.press('Space')
    await expect(playButton(page)).toBeVisible()
  })

  test('playing carries on when you switch tabs, and the Stage shows the same position', async ({ page }) => {
    await attachSong(page)
    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await goToStage(page)
    await expect(pauseButton(page)).toBeVisible()
    const before = await position(page)
    await expect.poll(() => position(page), { timeout: 20_000 }).toBeGreaterThan(before)
  })

  test('tapping the timeline moves the playhead to that count', async ({ page }) => {
    await attachSong(page)
    const canvas = page.locator('canvas[role="img"]')
    // (a tap before the timeline has measured itself and attached its listeners is ignored)
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(0)
    // (a click at coordinates below the visible window goes nowhere, and the timeline is near the bottom of the page)
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.6)
    await expect.poll(() => position(page)).toBeGreaterThan(10) // about halfway through a 30 s, 60 count song
    const after = await position(page)
    expect(after).toBeLessThan(40)

    // playing starts from there
    await playButton(page).click()
    await expect.poll(() => position(page)).toBeGreaterThan(after + 1)
  })

  test('dragging the slider while playing jumps the song there', async ({ page }) => {
    await attachSong(page)
    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await slider(page).fill('40')
    await expect.poll(() => position(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(40)
    await expect(pauseButton(page)).toBeVisible() // still playing
  })

  test('stops at the end of the song, and starts again from the beginning', async ({ page }) => {
    await chooseFile(page, { name: 'Short.wav', mimeType: 'audio/wav', buffer: wavFile({ seconds: 3 }) })
    await expect(page.getByText('Short.wav', { exact: true })).toBeVisible()
    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible() // it started...
    await expect(playButton(page)).toBeVisible({ timeout: 15_000 }) // ...and stopped by itself at the end
    expect(await position(page)).toBeGreaterThanOrEqual(5) // 3 s at 120 BPM is 6 counts

    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await expect(page.getByRole('alert')).toBeHidden()
  })

  test('explains when the song file is not on this device', async ({ page }) => {
    await attachSong(page)
    await waitForSaved(page)
    await goToStage(page)
    await page.reload()
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase('dance360-audio')
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
    )
    await playButton(page).click()
    await expect(page.getByRole('alert')).toContainText('not on this device')
    await expect(playButton(page)).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByRole('alert')).toBeHidden()
  })
})

test.describe('the stage follows the song', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  /**
   * One dancer, two formations (the second lands at count 8), the dancer moved to the middle of the stage in the second,
   * and a song attached. Returns where the dancer was in the first formation.
   */
  async function setUp(page: Page) {
    await createProject(page)
    await addDancer(page, 'Maya')
    await waitForSaved(page)
    const first = (await savedProject(page)).formations[0]
    const id = Object.keys(first.positions)[0]
    const home = first.positions[id] as { x: number; y: number }

    await page.getByRole('button', { name: '+ New formation' }).click()
    await expect(page.getByLabel('Formation name')).toHaveValue('Formation 2')
    const from = await stagePixel(page, home)
    const to = await stagePixel(page, { x: 20, y: 8 })
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => (await savedProject(page)).formations[1]?.positions[id]?.x).toBe(20)

    await goToSong(page)
    await attachSong(page)
    await goToStage(page)
    return home
  }
  const blue = rgb('#0072b2') // the colour of the "Everyone" part

  test('scrubbing shows the dancers where they are at that count', async ({ page }) => {
    const home = await setUp(page)
    await slider(page).fill('0')
    await expectDotColor(page, home, blue) // at the start, at home
    await slider(page).fill('8')
    await expectDotColor(page, { x: 20, y: 8 }, blue) // the second formation has landed
    await slider(page).fill('6') // half way through the four counts of travel
    await expect(page.getByLabel('Formation name')).toHaveValue('Formation 1') // still the first formation until it lands
    const halfway = { x: (home.x + 20) / 2, y: (home.y + 8) / 2 }
    await expectDotColor(page, halfway, blue)
  })

  test('the selected formation follows the position, forwards and backwards', async ({ page }) => {
    await setUp(page)
    await slider(page).fill('9')
    await expect(page.getByLabel('Formation name')).toHaveValue('Formation 2')
    await expect(page.getByText('2 of 2')).toBeVisible()
    await slider(page).fill('2')
    await expect(page.getByLabel('Formation name')).toHaveValue('Formation 1')
    await expect(page.getByText('1 of 2')).toBeVisible()
  })

  test('playing moves on to the next formation when the song gets there', async ({ page }) => {
    await setUp(page)
    await slider(page).fill('6')
    await playButton(page).click()
    await expect(page.getByLabel('Formation name')).toHaveValue('Formation 2', { timeout: 10_000 })
    expect(await position(page)).toBeGreaterThanOrEqual(8)
    await pauseButton(page).click()
    await expectDotColor(page, { x: 20, y: 8 }, blue) // and the dancer is there
  })

  test('stepping to a formation yourself stops the song and previews the step as before', async ({ page }) => {
    await setUp(page)
    await slider(page).fill('1')
    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await page.getByRole('button', { name: 'Next formation' }).click()
    await expect(playButton(page)).toBeVisible()
    await expect(page.getByLabel('Formation name')).toHaveValue('Formation 2')
    await expect.poll(() => dotColor(page, { x: 20, y: 8 }).then((c) => Math.abs(c[2] - blue[2]) < 4)).toBe(true)
  })

  test('grabbing a dot while the song plays stops it', async ({ page }) => {
    const home = await setUp(page)
    await slider(page).fill('0')
    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    // the dancer stays at home for the first four counts (until the travel to the second formation starts)
    const dot = await stagePixel(page, home)
    await page.mouse.move(dot.x, dot.y)
    await page.mouse.down()
    await page.mouse.move(dot.x + 5, dot.y + 5, { steps: 3 })
    await page.mouse.up()
    await expect(playButton(page)).toBeVisible()
  })

  test('the metronome clicks on every count while playing, only when switched on, and stops with the song', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __clicks: number[] }
      w.__clicks = []
      const original = OscillatorNode.prototype.start
      OscillatorNode.prototype.start = function (...args) {
        w.__clicks.push(this.frequency.value)
        return original.apply(this, args)
      }
    })
    await setUp(page)
    const clicks = () => page.evaluate(() => (window as unknown as { __clicks: number[] }).__clicks)

    await slider(page).fill('0')
    await playButton(page).click() // metronome is off
    await expect.poll(() => position(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(2) // really playing (however slow the machine)
    expect(await clicks()).toEqual([])

    await page.getByRole('checkbox', { name: 'Click on every count' }).check()
    await expect.poll(async () => (await clicks()).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3)
    const heard = await clicks()
    expect(heard.length).toBeLessThanOrEqual(8)
    expect(heard).toContain(1000) // the ordinary tick

    await pauseButton(page).click()
    const atPause = (await clicks()).length
    await page.waitForTimeout(800)
    expect((await clicks()).length).toBe(atPause)
  })

  test('the first count of a set gets the higher click', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __clicks: number[] }
      w.__clicks = []
      const original = OscillatorNode.prototype.start
      OscillatorNode.prototype.start = function (...args) {
        w.__clicks.push(this.frequency.value)
        return original.apply(this, args)
      }
    })
    await setUp(page)
    await page.getByRole('checkbox', { name: 'Click on every count' }).check()
    await slider(page).fill('6') // so count 8, the start of the second set, comes up in about a second
    await playButton(page).click()
    const heard = () => page.evaluate(() => (window as unknown as { __clicks: number[] }).__clicks)
    await expect.poll(heard, { timeout: 15_000 }).toContain(1600) // waits for count 8, however long the machine takes to start
    // (on a slow start the ticks before count 8 are already late and skipped, so the ordinary tick may only come with count 9)
    await expect.poll(heard, { timeout: 15_000 }).toContain(1000)
  })
})

test.describe('playback on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the controls fit and are touch sized on the stage and on the song tab', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await attachSong(page)
    for (const where of ['song', 'stage'] as const) {
      if (where === 'stage') await goToStage(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
      // boundingBox() does not wait for an element to be shown, and the bottom bar slides in when the Stage opens
      await expect(playButton(page)).toBeVisible()
      await expect(slider(page)).toBeVisible()
      const play = (await playButton(page).boundingBox())!
      expect(play.height).toBeGreaterThanOrEqual(40)
      expect(play.x + play.width).toBeLessThanOrEqual(390)
      const range = (await slider(page).boundingBox())!
      expect(range.height).toBeGreaterThanOrEqual(40)
      expect(range.x + range.width).toBeLessThanOrEqual(390)
      await expect(page.getByRole('button', { name: 'Mark', exact: true })).toBeVisible()
      const mark = (await page.getByRole('button', { name: 'Mark', exact: true }).boundingBox())!
      expect(mark.height).toBeGreaterThanOrEqual(40)
      expect(mark.x + mark.width).toBeLessThanOrEqual(390)
      await expect(page.getByRole('checkbox', { name: 'Click on every count' })).toBeVisible()
      const box = (await page.getByRole('checkbox', { name: 'Click on every count' }).boundingBox())!
      expect(box.x + box.width).toBeLessThanOrEqual(390)
    }
  })

  test('on a short screen the bottom bar scrolls inside itself, so the stage keeps most of the room', async ({ page }) => {
    await page.setViewportSize({ width: 683, height: 384 }) // a laptop zoomed to 200%
    await createProject(page)
    await goToSong(page)
    await attachSong(page)
    await goToStage(page)
    const footer = (await page.locator('footer').boundingBox())!
    expect(footer.height).toBeLessThanOrEqual(384 * 0.4 + 1)
    const stage = (await page.locator('canvas').first().boundingBox())!
    expect((stage.width * stage.height) / (683 * 384)).toBeGreaterThan(0.3)
    // everything in the bar can still be reached, by scrolling it
    await playButton(page).scrollIntoViewIfNeeded()
    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await pauseButton(page).click()
    await page.getByRole('button', { name: '+ New formation' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: '+ New formation' })).toBeInViewport()
  })

  test('plays on a phone', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await attachSong(page)
    await playButton(page).tap()
    await expect.poll(() => position(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(3)
    await pauseButton(page).tap()
    await expect(playButton(page)).toBeVisible()
  })
})
