import { expect, test } from '@playwright/test'
import {
  chooseFile,
  createProject,
  goToSong,
  goToStage,
  savedProject,
  storedSongs,
  timelineImage,
  waitForSaved,
  wavFile,
  waveformPixels,
} from './helpers'

const wav = (options?: Parameters<typeof wavFile>[0], name = 'Spring Medley.wav') => ({
  name,
  mimeType: 'audio/wav',
  buffer: wavFile(options),
})

test.describe('the song tab', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await goToSong(page)
  })

  test('starts with no song, and the timeline still shows the counts', async ({ page }) => {
    await expect(page.getByText(/No song yet/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Attach song' })).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/Timeline of 1 formation over 8 counts\.$/)
  })

  test('attaching a real audio file shows its details and draws its waveform', async ({ page }) => {
    const before = await waveformPixels(page)
    await chooseFile(page, wav())

    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    await expect(page.getByText(/^0:06 · 94 KB$/)).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/with the waveform of Spring Medley.wav \(0:06\)/)
    await expect.poll(() => waveformPixels(page)).toBeGreaterThan(before + 40)
    await expect(page.getByRole('button', { name: 'Replace song' })).toBeVisible()
    expect((await storedSongs(page)).length).toBe(1)
  })

  test('saves the song details with the project, never the audio, and keeps the file across a reload', async ({ page }) => {
    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    await waitForSaved(page)

    const project = await savedProject(page)
    expect(project.song).toMatchObject({ name: 'Spring Medley.wav', mime: 'audio/wav', size: 96044 })
    expect(project.song.durationSec).toBeCloseTo(6, 1)
    expect(project.song.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(project).length).toBeLessThan(5000) // the 96 KB of audio is not in there

    await page.reload()
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/with the waveform/)
    await expect(page.getByText(/not on this device/)).toBeHidden()
  })

  test('replacing the song swaps the file and clears the old one from the device', async ({ page }) => {
    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    const [first] = await storedSongs(page)

    await chooseFile(page, wav({ seconds: 4, frequency: 660 }, 'Finale.wav'))
    await expect(page.getByText('Finale.wav')).toBeVisible()
    await expect(page.getByText('Spring Medley.wav')).toBeHidden()
    await expect.poll(async () => (await storedSongs(page)).length).toBe(1)
    expect((await storedSongs(page))[0]).not.toBe(first)
  })

  test('removing the song asks first, then clears it and its file', async ({ page }) => {
    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Spring Medley.wav')
      void dialog.dismiss()
    })
    await page.getByRole('button', { name: 'Remove song' }).click()
    await expect(page.getByText('Spring Medley.wav')).toBeVisible() // cancelled: still there

    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Remove song' }).click()
    await expect(page.getByText(/No song yet/)).toBeVisible()
    await expect.poll(async () => (await storedSongs(page)).length).toBe(0)
    await waitForSaved(page)
    expect((await savedProject(page)).song).toBeNull()
  })

  test('refuses a file that is not audio, and one that cannot be decoded, with a clear message', async ({ page }) => {
    await chooseFile(page, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(page.getByRole('alert')).toContainText('does not look like an audio file')

    await chooseFile(page, { name: 'broken.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('this is not really an mp3 at all') })
    await expect(page.getByRole('alert')).toContainText('could not be read as audio')
    await expect(page.getByText(/No song yet/)).toBeVisible() // nothing changed
    expect(await storedSongs(page)).toEqual([])

    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByRole('alert')).toBeHidden()
  })

  test('setting the tempo is saved, including a decimal BPM and fine nudges of the start point', async ({ page }) => {
    const bpm = page.getByRole('textbox', { name: 'BPM', exact: true })
    await bpm.fill('127.5')
    await bpm.press('Enter')
    const start = page.getByLabel('Start point (seconds)')
    await start.fill('1.25')
    await start.press('Enter')
    await page.getByRole('button', { name: 'Start 0.01 seconds later' }).click()
    await expect(start).toHaveValue('1.26')
    await waitForSaved(page)

    await page.reload()
    await expect(page.getByRole('textbox', { name: 'BPM', exact: true })).toHaveValue('127.5')
    await expect(page.getByLabel('Start point (seconds)')).toHaveValue('1.26')
    expect((await savedProject(page)).tempo).toEqual({ bpm: 127.5, startOffsetSec: 1.26, changes: [] })
  })

  test('the timeline zooms with its buttons and the mouse wheel, scrolls by dragging, and Fit restores it', async ({ page }) => {
    await chooseFile(page, wav({ seconds: 20 }))
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/with the waveform/)
    const fitted = await timelineImage(page)

    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect.poll(() => timelineImage(page)).not.toBe(fitted)
    await page.getByRole('button', { name: 'Fit' }).click()
    await expect.poll(() => timelineImage(page)).toBe(fitted)

    await page.locator('canvas[role="img"]').scrollIntoViewIfNeeded() // a mouse at coordinates below the visible window reaches nothing
    const box = (await page.locator('canvas[role="img"]').boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -400)
    await expect.poll(() => timelineImage(page)).not.toBe(fitted)

    const zoomed = await timelineImage(page)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 6 })
    await page.mouse.up()
    await expect.poll(() => timelineImage(page)).not.toBe(zoomed)
  })

  test('shows the formations as markers on the timeline', async ({ page }) => {
    await goToStage(page)
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByRole('button', { name: '+ New formation' }).click()
    await goToSong(page)
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/Timeline of 3 formations over 24 counts/)
  })

  test('attaching can be undone and redone, and the file is still there after redo', async ({ page }) => {
    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText(/No song yet/)).toBeVisible()

    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/with the waveform/)
  })

  test('the Song tab is one of the project tabs, and the song is part of what the project remembers', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Song', exact: true })).toHaveAttribute('aria-current', 'page')
    await goToStage(page)
    await expect(page.getByRole('link', { name: 'Song', exact: true })).not.toHaveAttribute('aria-current', 'page')
  })
})

test.describe('a song whose file is not on this device', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  async function projectWithSongThenLoseTheFile(page: import('@playwright/test').Page) {
    await createProject(page)
    await goToSong(page)
    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav', { exact: true })).toBeVisible()
    await waitForSaved(page)

    // As if opened on another device: leave the page (closing its database connection), wipe the files, come back.
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
    await goToSong(page)
  }

  test('says so, keeps the project intact, and asks for the file again', async ({ page }) => {
    await projectWithSongThenLoseTheFile(page)
    await expect(page.getByText('The song file is not on this device.')).toBeVisible()
    await expect(page.getByText('Spring Medley.wav', { exact: true })).toBeVisible() // the project still knows its song
    await expect(page.getByRole('button', { name: 'Choose the file again' })).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).not.toHaveAccessibleName(/with the waveform/)
  })

  test('refuses a different file, and accepts the original, bringing the waveform back', async ({ page }) => {
    await projectWithSongThenLoseTheFile(page)

    // the second file picker on the page is the one in the notice
    await chooseFile(page, wav({ seconds: 3, frequency: 880 }, 'something else.wav'), 1)
    await expect(page.getByRole('alert')).toContainText('not the same file')
    await expect(page.getByText('The song file is not on this device.')).toBeVisible()

    await chooseFile(page, wav(), 1)
    await expect(page.getByText('The song file is not on this device.')).toBeHidden()
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/with the waveform/)
    expect((await storedSongs(page)).length).toBe(1)
  })

  test('deleting a project clears its song from the device', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    await waitForSaved(page)
    expect((await storedSongs(page)).length).toBe(1)

    await page.getByRole('link', { name: 'Dance 360' }).click()
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: /^Delete / }).click()
    await expect.poll(async () => (await storedSongs(page)).length).toBe(0)
  })
})

test.describe('the song tab on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('fits the screen, with touch-sized buttons, and can attach a song', async ({ page }) => {
    await createProject(page)
    await goToSong(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

    for (const name of ['Attach song', 'Zoom in', 'Zoom out', 'Fit', 'Start 0.01 seconds later']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40)
      expect(box.x + box.width, `${name} fits`).toBeLessThanOrEqual(390)
    }

    await chooseFile(page, wav())
    await expect(page.getByText('Spring Medley.wav')).toBeVisible()
    await expect(page.locator('canvas[role="img"]')).toHaveAccessibleName(/with the waveform/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    const canvas = (await page.locator('canvas[role="img"]').boundingBox())!
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(390)
  })

  test('all three project tabs fit on one row', async ({ page }) => {
    await createProject(page)
    const nav = page.getByRole('navigation', { name: 'Project sections' })
    const overflow = await nav.evaluate((el) => ({ x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight }))
    expect(overflow).toEqual({ x: 0, y: 0 })
    for (const name of ['Stage', 'Cast & Parts', 'Song']) await expect(nav.getByRole('link', { name })).toBeVisible()
  })
})
