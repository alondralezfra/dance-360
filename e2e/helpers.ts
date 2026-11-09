import { expect, type Page } from '@playwright/test'
import { fitStage } from '../src/features/stage/stageLayout'

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

/** Where a point on stage (in feet) is drawn on screen, using the app's own layout maths. */
export async function stagePixel(page: Page, feet: { x: number; y: number }, stage = { width: 40, depth: 24 }) {
  const box = (await page.locator('canvas').first().boundingBox())!
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

/** Compare two colours allowing a little rounding. */
export function expectColor(actual: number[], expected: number[]) {
  actual.forEach((channel, i) => expect(Math.abs(channel - expected[i]), `rgb(${actual}) vs rgb(${expected})`).toBeLessThanOrEqual(3))
}
