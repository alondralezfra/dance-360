import { expect, type Locator, type Page } from '@playwright/test'
import { fitStage } from '../src/features/stage/stageLayout'
import { beatTrack, wavBytes, whiteNoise, type BeatTrackOptions } from '../src/test/syntheticAudio'

/** The prototype's original save format (v0), used to test the one-time import. */
export const legacyProject = {
  version: 0,
  state: {
    name: 'Legacy dance',
    stage: { width: 40, depth: 24 },
    dancers: [
      { id: 'd1', name: 'Jordan Lee' },
      { id: 'd2', name: 'Priya' },
    ],
    formations: [
      { id: 'f1', name: 'Opening', positions: { d1: { x: 10, y: 12 }, d2: { x: 30, y: 12 } } },
      { id: 'f2', name: 'Cross', positions: { d1: { x: 30, y: 8 }, d2: { x: 10, y: 8 } } },
    ],
    currentFormationId: 'f1',
  },
}

/** Put the app in a known state: empty storage, on the projects home. */
export async function resetStorage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

/** Create a project from the home screen and wait for the stage editor. */
export async function createProject(page: Page) {
  await resetStorage(page)
  await page.getByRole('button', { name: '+ New project' }).click()
  await page.waitForURL(/\/projects\/.+\/stage/)
  await expect(page.getByLabel('Project name')).toBeVisible()
}

/** Add a dancer; works with the desktop sidebar or the phone drawer (whichever is showing). */
export async function addDancer(page: Page, name: string) {
  const dialog = page.getByRole('dialog')
  const scope = (await dialog.count()) > 0 ? dialog : page
  await scope.getByPlaceholder('Dancer name').fill(name)
  await scope.getByRole('button', { name: 'Add', exact: true }).click()
}

/** Wait until autosave has written to storage. */
export async function waitForSaved(page: Page) {
  await expect(page.getByRole('status').getByText('Saved')).toBeVisible()
}

/** Read the (single) saved project's document straight from storage. */
export async function savedProject(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('dance360:project:'))
    return key ? JSON.parse(localStorage.getItem(key)!).project : null
  })
}

/**
 * Where a point on stage (in feet) is drawn on screen, using the app's own layout maths.
 * Waits (up to `timeoutMs`) for the stage canvas to be drawn: it only appears once its container has been
 * measured, so right after a screen opens it can be missing or hidden for a moment, longer on a slow runner.
 */
export async function stagePixel(page: Page, feet: { x: number; y: number }, stage = { width: 40, depth: 24 }, timeoutMs = 10_000) {
  const canvas = page.locator('canvas').first()
  const found: { box: Awaited<ReturnType<typeof canvas.boundingBox>> } = { box: null }
  try {
    await expect
      .poll(async () => ((found.box = await canvas.boundingBox({ timeout: 1000 }).catch(() => null)) === null ? 'not drawn' : 'drawn'), { timeout: timeoutMs })
      .toBe('drawn')
  } catch {
    throw new Error(`The stage canvas was not drawn within ${timeoutMs} ms (is the stage screen open?)`)
  }
  const box = found.box!
  const dpr = await page.evaluate(() => window.devicePixelRatio)
  const { scale, originX, originY } = fitStage(box, stage, dpr)
  return { x: box.x + originX + feet.x * scale, y: box.y + originY + feet.y * scale, scale }
}

export async function goToCast(page: Page) {
  await page.getByRole('link', { name: 'Cast & Parts' }).click()
  await expect(page).toHaveURL(/\/cast$/)
}

export async function goToStage(page: Page) {
  await page.getByRole('link', { name: 'Stage', exact: true }).click()
  await expect(page).toHaveURL(/\/stage$/)
}

/** [r, g, b] of a hex colour like "#0072b2". */
export const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/**
 * The colour drawn for a dancer's dot, read from the canvas pixels. Samples
 * just below the centre, clear of the initials, inside the dot.
 */
export async function dotColor(page: Page, feet: { x: number; y: number }) {
  const { x, y, scale } = await stagePixel(page, feet)
  const radius = 0.6 * scale // DOT_FEET / 2 in StageCanvas
  return page.evaluate(
    ({ x, y }) => {
      const canvas = [...document.querySelectorAll('canvas')].at(-1)! // the dancers layer is on top
      const box = canvas.getBoundingClientRect()
      const ratio = canvas.width / box.width
      const data = canvas.getContext('2d')!.getImageData((x - box.left) * ratio, (y - box.top) * ratio, 1, 1).data
      return [data[0], data[1], data[2]]
    },
    { x, y: y + 0.65 * radius },
  )
}

const sameColor = (actual: number[], expected: number[]) => actual.every((channel, i) => Math.abs(channel - expected[i]) <= 3)

/**
 * Wait until the dot at `feet` is drawn in `expected` (allowing a little rounding). The canvas is painted a moment
 * after the data changes (a scrub, an assignment, a screen opening), longer on a slow runner, so sampling it once
 * can read a blank pixel: poll instead.
 */
export async function expectDotColor(page: Page, feet: { x: number; y: number }, expected: number[]) {
  await expect
    .poll(async () => {
      const actual = await dotColor(page, feet)
      return sameColor(actual, expected) ? 'as expected' : `rgb(${actual}) but wanted rgb(${expected})`
    })
    .toBe('as expected')
}

/** A real, playable mono WAV file: a sine tone that is loud for the first half and quiet for the second. */
export function wavFile({ seconds = 6, frequency = 440, sampleRate = 8000 } = {}): Buffer {
  const count = Math.floor(seconds * sampleRate)
  const data = Buffer.alloc(count * 2)
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate
    const level = t < seconds / 2 ? 1 : 0.25
    data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * frequency * t) * 12000 * level), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

/**
 * Draws the page in a wide font. CI's Linux browser uses DejaVu Sans, much wider than Segoe UI or Roboto (Verdana is
 * as wide and is on Windows), so a layout that only fits in a narrow font passes here and fails there.
 */
export async function useWideFont(page: Page) {
  await page.addStyleTag({ content: 'body, input, button, select, textarea { font-family: "DejaVu Sans", Verdana, sans-serif !important }' })
}

/** True when the open tab lies wholly inside the visible part of the (sideways scrolling) project tab row. */
export async function tabFullyInView(nav: Locator) {
  return nav
    .evaluate((el) => {
      const open = el.querySelector('[aria-current="page"]')
      if (!open) return false
      const row = el.getBoundingClientRect()
      const tab = open.getBoundingClientRect()
      return tab.left >= row.left - 0.5 && tab.right <= row.right + 0.5
    })
    .catch(() => false)
}

export async function goToResources(page: Page) {
  await page.getByRole('link', { name: 'Resources', exact: true }).click()
  await expect(page).toHaveURL(/\/resources$/)
}

/** Add a link on the Resources tab with the form at the top. */
export async function addLink(page: Page, url: string, title = '') {
  await page.getByLabel('Web address of the new link').fill(url)
  await page.getByLabel('Title of the new link').fill(title)
  await page.getByRole('button', { name: '+ Add link' }).click()
}

/** Add a note on the Resources tab with the form at the top (what it is about stays as it was left). */
export async function addNote(page: Page, text: string) {
  await page.getByLabel('Text of the new note').fill(text)
  await page.getByRole('button', { name: '+ Add note' }).click()
}

export async function goToSong(page: Page) {
  await page.getByRole('link', { name: 'Song', exact: true }).click()
  await expect(page).toHaveURL(/\/song$/)
}

/** Choose a file in the (hidden) file picker on the Song tab. `which` picks among several pickers on the page. */
export async function chooseFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }, which = 0) {
  await page.locator('input[type="file"]').nth(which).setInputFiles(file)
}

/** The song files kept in the browser's database right now (their hashes). Does not create the database if it is absent. */
export async function storedSongs(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const known = await indexedDB.databases()
    if (!known.some((d) => d.name === 'dance360-audio')) return []
    return new Promise<string[]>((resolve, reject) => {
      const open = indexedDB.open('dance360-audio')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const keys = db.transaction('files').objectStore('files').getAllKeys()
        keys.onsuccess = () => {
          db.close()
          resolve(keys.result.map(String))
        }
      }
    })
  })
}

/** Everything drawn on the timeline canvas, as an image string: two draws are equal only if every pixel is. */
export async function timelineImage(page: Page): Promise<string> {
  return page.locator('canvas[role="img"]').evaluate((c) => (c as HTMLCanvasElement).toDataURL())
}

/**
 * How many pixels along a line through the lower part of the timeline differ from the plain background
 * (its most common colour): the waveform ink plus the few grid lines crossing it. Compare before and after.
 */
export async function waveformPixels(page: Page): Promise<number> {
  return page.locator('canvas[role="img"]').evaluate((c) => {
    const canvas = c as HTMLCanvasElement
    const { width, height } = canvas
    const row = canvas.getContext('2d')!.getImageData(0, Math.round(height * 0.62), width, 1).data
    const counts = new Map<string, number>()
    for (let x = 0; x < width; x++) {
      const key = row[x * 4] + ',' + row[x * 4 + 1] + ',' + row[x * 4 + 2]
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const background = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    return width - (counts.get(background) ?? 0)
  })
}

// Making a minute of audio sample by sample takes a moment, and many tests want the same few files.
const made = new Map<string, Buffer>()
const once = (key: string, make: () => Buffer) => made.get(key) ?? (made.set(key, make()), made.get(key)!)

/** A real WAV file of made-up music with a known tempo and first beat, for testing the tempo estimate. */
export function beatsWav(options: BeatTrackOptions, name = 'Beats.wav') {
  const buffer = once('beats:' + JSON.stringify(options), () => Buffer.from(wavBytes(beatTrack(options))))
  return { name, mimeType: 'audio/wav', buffer }
}

/** A real WAV file of noise: sound, but no beat. */
export function noiseWav(seconds = 20, name = 'Noise.wav') {
  return { name, mimeType: 'audio/wav', buffer: once('noise:' + seconds, () => Buffer.from(wavBytes(whiteNoise(seconds)))) }
}

/** The BPM and start point currently shown in the tempo fields. */
export async function shownTempo(page: Page) {
  return {
    bpm: Number(await page.getByRole('textbox', { name: 'BPM', exact: true }).inputValue()),
    start: Number(await page.getByLabel('Start point (seconds)').inputValue()),
  }
}
