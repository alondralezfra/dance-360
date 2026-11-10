import { expect, test, type Page } from '@playwright/test'
import {
  beatsWav,
  chooseFile,
  createProject,
  goToSong,
  noiseWav,
  savedProject,
  shownTempo,
  waitForSaved,
} from './helpers'

/** The note about the estimate in the Tempo section (not the header's "Saved" indicator, which is a status too). */
const tempoNote = (page: Page) => page.getByRole('region', { name: 'Tempo' }).getByRole('status')

// These use real audio files and the browser's real decoder: made-up music with a known tempo.
const song = (bpm = 128, extra: object = {}) => beatsWav({ bpm, seconds: 30, firstBeatSec: 0.5, ...extra }, 'Groove.wav')

test.describe('tempo estimated from the song', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await goToSong(page)
  })

  test('attaching a song fills in the BPM and the first beat, and says it is an estimate', async ({ page }) => {
    await chooseFile(page, song(128))
    await expect(tempoNote(page).filter({ hasText: 'Estimated from the song' })).toBeVisible({ timeout: 20_000 })

    const { bpm, start } = await shownTempo(page)
    expect(Math.abs(bpm - 128)).toBeLessThan(0.3)
    expect(Math.abs(start - 0.5)).toBeLessThan(0.03)
    await expect(tempoNote(page)).toContainText('check it against the waveform')
  })

  test('works for other tempos too, including one that is not a whole number', async ({ page }) => {
    await chooseFile(page, song(105.5))
    await expect(tempoNote(page).filter({ hasText: 'Estimated from the song' })).toBeVisible({ timeout: 20_000 })
    expect(Math.abs((await shownTempo(page)).bpm - 105.5)).toBeLessThan(0.3)
  })

  test('is saved with the project like any tempo you typed', async ({ page }) => {
    await chooseFile(page, song(128))
    await expect(tempoNote(page).filter({ hasText: 'Estimated' })).toBeVisible({ timeout: 20_000 })
    await waitForSaved(page)

    await page.reload()
    const { bpm, start } = await shownTempo(page)
    expect(Math.abs(bpm - 128)).toBeLessThan(0.3)
    expect(Math.abs(start - 0.5)).toBeLessThan(0.03)
    expect((await savedProject(page)).tempo.changes).toEqual([])
    await expect(tempoNote(page)).toBeHidden() // the note was about this attach, not a saved fact
  })

  test('is taken back together with the song in one undo, and comes back with redo', async ({ page }) => {
    await chooseFile(page, song(128))
    await expect(tempoNote(page).filter({ hasText: 'Estimated' })).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText(/No song yet/)).toBeVisible()
    expect(await shownTempo(page)).toEqual({ bpm: 120, start: 0 })

    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByText('Groove.wav', { exact: true })).toBeVisible()
    expect(Math.abs((await shownTempo(page)).bpm - 128)).toBeLessThan(0.3)
  })

  test('never overwrites a tempo you set: it is offered instead, and one click takes it', async ({ page }) => {
    const bpm = page.getByRole('textbox', { name: 'BPM', exact: true })
    await bpm.fill('96')
    await bpm.press('Enter')

    await chooseFile(page, song(128))
    const note = tempoNote(page).filter({ hasText: 'differs from your tempo' })
    await expect(note).toBeVisible({ timeout: 20_000 })
    expect((await shownTempo(page)).bpm).toBe(96) // untouched

    await page.getByRole('button', { name: 'Use this tempo' }).click()
    expect(Math.abs((await shownTempo(page)).bpm - 128)).toBeLessThan(0.3)
    await expect(tempoNote(page)).toContainText('Estimated from the song')
  })

  test('says so when the song has no steady beat, and leaves the tempo alone', async ({ page }) => {
    await chooseFile(page, noiseWav())
    await expect(tempoNote(page).filter({ hasText: 'Could not tell the tempo' })).toBeVisible({ timeout: 20_000 })
    expect(await shownTempo(page)).toEqual({ bpm: 120, start: 0 })
    await expect(page.getByText('Noise.wav', { exact: true })).toBeVisible() // the song itself attached fine
  })

  test('Half and Double fix an estimate that is an octave off', async ({ page }) => {
    await chooseFile(page, song(128))
    await expect(tempoNote(page).filter({ hasText: 'Estimated' })).toBeVisible({ timeout: 20_000 })
    const estimated = (await shownTempo(page)).bpm

    await page.getByRole('button', { name: 'Half the BPM' }).click()
    await expect(page.getByRole('textbox', { name: 'BPM', exact: true })).toHaveValue(String(Math.round((estimated / 2) * 10) / 10))
    await page.getByRole('button', { name: 'Double the BPM' }).click()
    expect(Math.abs((await shownTempo(page)).bpm - estimated)).toBeLessThan(0.2)
    expect((await shownTempo(page)).start).toBeCloseTo(0.5, 1) // the start point is left alone
  })

  test('"Estimate from song" works the tempo out again on request, over whatever is set', async ({ page }) => {
    await chooseFile(page, noiseWav())
    await expect(page.getByText('Noise.wav', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Estimate from song' })).toBeVisible()

    // replace with a song that has a beat, after setting a tempo by hand, then ask again
    await chooseFile(page, song(140))
    await expect(page.getByText('Groove.wav', { exact: true })).toBeVisible()
    const bpm = page.getByRole('textbox', { name: 'BPM', exact: true })
    await bpm.fill('100')
    await bpm.press('Enter')
    await page.getByRole('button', { name: 'Estimate from song' }).click()
    await expect.poll(async () => Math.abs((await shownTempo(page)).bpm - 140)).toBeLessThan(0.3)
    await expect(tempoNote(page)).toContainText('Estimated from the song')
  })

  test('is not offered when the song file is not on this device', async ({ page }) => {
    await chooseFile(page, song(128))
    await expect(tempoNote(page).filter({ hasText: 'Estimated' })).toBeVisible({ timeout: 20_000 })
    await waitForSaved(page)
    await page.getByRole('link', { name: 'Stage', exact: true }).click()
    await page.reload()
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase('dance360-audio')
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
    )
    await goToSong(page)
    await expect(page.getByText('The song file is not on this device.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Estimate from song' })).toBeHidden()
    expect(Math.abs((await shownTempo(page)).bpm - 128)).toBeLessThan(0.3) // the tempo stays
  })

  test('a long song is analysed in reasonable time', async ({ page }) => {
    const started = Date.now()
    await chooseFile(page, beatsWav({ bpm: 124, seconds: 240, firstBeatSec: 0.3 }, 'Long.wav'))
    await expect(tempoNote(page).filter({ hasText: 'Estimated' })).toBeVisible({ timeout: 45_000 })
    expect(Date.now() - started).toBeLessThan(40_000)
    expect(Math.abs((await shownTempo(page)).bpm - 124)).toBeLessThan(0.2)
  })
})

test.describe('tempo estimate on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the note and the new buttons fit the screen and are touch sized', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await chooseFile(page, song(128))
    await expect(tempoNote(page).filter({ hasText: 'Estimated' })).toBeVisible({ timeout: 30_000 })

    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    for (const name of ['Half the BPM', 'Double the BPM', 'Estimate from song']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40)
      expect(box.x + box.width, `${name} fits`).toBeLessThanOrEqual(390)
    }
  })
})
