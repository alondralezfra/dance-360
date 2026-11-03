import { expect, type Page } from '@playwright/test'

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
 * Where a point on stage (in feet) is drawn on screen. Mirrors the layout math
 * in StageCanvas (36px margin, stage centred and scaled to fit).
 */
export async function stagePixel(page: Page, feet: { x: number; y: number }, stage = { width: 40, depth: 24 }) {
  const box = (await page.locator('canvas').first().boundingBox())!
  const margin = 36
  const scale = Math.max(1, Math.min((box.width - margin * 2) / stage.width, (box.height - margin * 2) / stage.depth))
  const originX = (box.width - stage.width * scale) / 2
  const originY = (box.height - stage.depth * scale) / 2
  return { x: box.x + originX + feet.x * scale, y: box.y + originY + feet.y * scale, scale }
}
