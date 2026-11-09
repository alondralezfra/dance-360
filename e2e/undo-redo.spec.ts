import { expect, test } from '@playwright/test'
import { addDancer, createProject, savedProject, stagePixel, waitForSaved } from './helpers'

test.describe('undo and redo', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await createProject(page)
  })

  test('buttons undo and redo, and are disabled when there is nothing to do', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
    await addDancer(page, 'Maya')
    await expect(page.getByText('Dancers (1)')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Dancers (0)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()

    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByText('Dancers (1)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  test('Ctrl+Z / Ctrl+Shift+Z work from the stage, and the result is saved', async ({ page }) => {
    await addDancer(page, 'Maya')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await expect(page.getByText('2 of 2')).toBeVisible()
    const empty = await stagePixel(page, { x: 30, y: 5 })
    await page.mouse.click(empty.x, empty.y) // an empty spot on the stage: focus leaves any text box

    await page.keyboard.press('Control+z')
    await expect(page.getByText(/of 1$/)).toBeVisible()
    await waitForSaved(page)
    expect((await savedProject(page)).formations).toHaveLength(1)

    await page.keyboard.press('Control+Shift+z')
    await expect(page.getByText(/of 2$/)).toBeVisible()
    await waitForSaved(page)
    expect((await savedProject(page)).formations).toHaveLength(2)
  })

  test('undoes a dragged dot back to where it was', async ({ page }) => {
    await addDancer(page, 'Maya')
    await waitForSaved(page)
    const spot = (await savedProjectPosition(page))! // where a new dancer is placed
    const from = await stagePixel(page, spot)
    const to = await stagePixel(page, { x: 20, y: 8 })
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 8 })
    await page.mouse.up()
    await expect.poll(() => savedProjectPosition(page)).toEqual({ x: 20, y: 8 })

    await page.getByRole('button', { name: 'Undo' }).click()
    await waitForSaved(page)
    expect(await savedProjectPosition(page)).toEqual(spot)
  })

  test('typing a new name is a single undo step', async ({ page }) => {
    await addDancer(page, 'Maya')
    const name = page.getByLabel('Dancer name').first()
    await name.fill('')
    await name.pressSequentially('Mayaa', { delay: 20 })
    await expect(name).toHaveValue('Mayaa')

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(name).toHaveValue('Maya')
  })

  test('Ctrl+Z inside a text box is left to the browser', async ({ page }) => {
    await addDancer(page, 'Maya')
    await page.getByLabel('Dancer name').first().focus()
    await page.keyboard.press('Control+z')
    await expect(page.getByText('Dancers (1)')).toBeVisible()
  })

  test('also covers the Cast & Parts tab', async ({ page }) => {
    await page.getByRole('link', { name: 'Cast & Parts' }).click()
    await page.getByRole('button', { name: '+ Add part' }).click()
    await expect(page.getByLabel(/^Name of part/)).toHaveCount(2)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByLabel(/^Name of part/)).toHaveCount(1)
  })

  test('history starts fresh after a reload', async ({ page }) => {
    await addDancer(page, 'Maya')
    await waitForSaved(page)
    await page.reload()
    await expect(page.getByText('Dancers (1)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})

test.describe('undo on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the buttons fit, are touch sized, and undo works', async ({ page }) => {
    await createProject(page)
    for (const name of ['Undo', 'Redo']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(40)
      expect(box.x + box.width).toBeLessThanOrEqual(390)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

    await page.getByRole('button', { name: '+ New formation' }).click()
    await expect(page.getByText('2 of 2')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText(/of 1$/)).toBeVisible()
  })
})

async function savedProjectPosition(page: import('@playwright/test').Page) {
  const project = await savedProject(page)
  const dancerId = project?.dancers?.[0]?.id
  return dancerId ? (project.formations[0].positions[dancerId] as { x: number; y: number }) : null
}
