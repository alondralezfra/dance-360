import { expect, test, type Page } from '@playwright/test'
import { addDancer, createProject, savedProject, waitForSaved } from './helpers'

const canvasBox = async (page: Page) => (await page.locator('canvas').first().boundingBox())!

/** Press on one formation chip and drag it onto another, in small steps like a real hand. */
async function dragChip(page: Page, from: string | RegExp, to: string | RegExp) {
  const a = (await page.getByRole('button', { name: from }).boundingBox())!
  const b = (await page.getByRole('button', { name: to }).boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 3 })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
  await page.mouse.up()
}

const chipNames = async (page: Page) =>
  (await page.getByRole('group', { name: 'Formations' }).getByRole('button').allInnerTexts()).map((t) =>
    t.replace(/\s+/g, ' ').trim().replace(/^(\d+)\. /, '$1.'), // "1. Name" and "1.Name" read the same
  )

test.describe('reordering formations', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByRole('button', { name: '+ New formation' }).click()
    await expect(page.getByText('3 of 3')).toBeVisible()
  })

  test('dragging a formation changes the order, and the song keeps its timing slots', async ({ page }) => {
    await page.getByLabel('Formation name').fill('Finale')
    await dragChip(page, /Finale/, /^1\.\s*Formation 1/)

    expect(await chipNames(page)).toEqual(['1.Finale', '2.Formation 1', '3.Formation 2'])
    await waitForSaved(page)
    const saved = await savedProject(page)
    expect(saved.formations.map((f: { name: string }) => f.name)).toEqual(['Finale', 'Formation 1', 'Formation 2'])
    // Counts did not move: Finale now lands where the first formation did.
    expect(saved.formations.map((f: { count: number }) => f.count)).toEqual([0, 8, 16])
  })

  test('a plain click selects without reordering', async ({ page }) => {
    await page.getByRole('button', { name: /^1\.\s*Formation 1/ }).click()
    await expect(page.getByText('1 of 3')).toBeVisible()
    expect(await chipNames(page)).toEqual(['1.Formation 1', '2.Formation 2', '3.Formation 3'])
  })

  test('works from the keyboard with Alt + arrow keys', async ({ page }) => {
    await page.getByRole('button', { name: /^3\.\s*Formation 3/ }).focus()
    await page.keyboard.press('Alt+ArrowLeft')
    expect(await chipNames(page)).toEqual(['1.Formation 1', '2.Formation 3', '3.Formation 2'])
  })

  test('reordering survives a reload', async ({ page }) => {
    await page.getByRole('button', { name: /^3\.\s*Formation 3/ }).focus()
    await page.keyboard.press('Alt+ArrowLeft')
    await waitForSaved(page)
    await page.reload()
    expect(await chipNames(page)).toEqual(['1.Formation 1', '2.Formation 3', '3.Formation 2'])
  })
})

test.describe('collapsible panels', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await createProject(page)
  })

  test('hiding the sidebar makes the stage wider, showing it brings it back', async ({ page }) => {
    const before = await canvasBox(page)
    await page.getByRole('button', { name: 'Hide dancer panel' }).click()
    await expect.poll(async () => (await canvasBox(page)).width).toBeGreaterThan(before.width + 200)
    await expect(page.getByPlaceholder('Dancer name')).toBeHidden()

    await page.getByRole('button', { name: 'Show dancer panel' }).click()
    await expect.poll(async () => Math.abs((await canvasBox(page)).width - before.width)).toBeLessThan(2)
    await expect(page.getByPlaceholder('Dancer name')).toBeVisible()
  })

  test('hiding the formation bar makes the stage taller', async ({ page }) => {
    const before = await canvasBox(page)
    await page.getByRole('button', { name: 'Hide formation bar' }).click()
    await expect.poll(async () => (await canvasBox(page)).height).toBeGreaterThan(before.height + 80)
    await expect(page.getByLabel('Formation name')).toBeHidden()

    await page.getByRole('button', { name: 'Show formation bar' }).click()
    await expect(page.getByLabel('Formation name')).toBeVisible()
  })

  test('remembers what you hid after a reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide dancer panel' }).click()
    await page.getByRole('button', { name: 'Hide formation bar' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Show dancer panel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show formation bar' })).toBeVisible()
    await expect(page.getByLabel('Formation name')).toBeHidden()
  })

  test('the stage fills the window with both panels hidden', async ({ page }) => {
    await addDancer(page, 'Maya')
    await page.getByRole('button', { name: 'Hide dancer panel' }).click()
    await page.getByRole('button', { name: 'Hide formation bar' }).click()
    await expect.poll(async () => (await canvasBox(page)).width).toBeGreaterThan(1200)
  })
})

test.describe('stage size when the browser zooms', () => {
  // Browser zoom (Ctrl +) shrinks the CSS-pixel viewport while the header and bars keep their
  // CSS-pixel heights, so they take a bigger share of the screen. The stage must stay usable
  // (it fits whatever room is left), and hiding the formation bar must give the room back.
  test('at 150% and 200% the stage stays usable, and hiding the bar gives it the room back', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await createProject(page)
    const screenShare = async () => {
      const box = await canvasBox(page)
      const viewport = page.viewportSize()!
      return (box.width * box.height) / (viewport.width * viewport.height)
    }
    await expect.poll(screenShare).toBeGreaterThan(0.6)

    for (const [w, h] of [
      [911, 512], // 150%
      [683, 384], // 200%
    ]) {
      await page.setViewportSize({ width: w, height: h })
      await expect.poll(screenShare).toBeGreaterThan(0.3)
      await page.getByRole('button', { name: 'Hide formation bar' }).click()
      await expect.poll(screenShare).toBeGreaterThan(0.6)
      await page.getByRole('button', { name: 'Show formation bar' }).click()
    }
  })
})

test.describe('the header with a wide font', () => {
  // CI's Linux browser draws text in DejaVu Sans, which is much wider than Segoe UI or Roboto; Verdana is as wide
  // and is on Windows. At 150% zoom (911px) the header is one row of breadcrumb, four tabs, Undo/Redo and the save
  // status, and a wide font must not push the last of them onto a second row (that cost the stage a quarter of its
  // room on CI). A test that only passes with this machine's narrow font proves nothing about CI.
  test('stays on one row at 150% zoom and at a normal desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await createProject(page)
    await page.addStyleTag({ content: 'body, input, button, select { font-family: "DejaVu Sans", Verdana, sans-serif !important }' })
    const header = page.locator('header')
    for (const [w, h] of [
      [1366, 768],
      [911, 512], // 150%
    ]) {
      await page.setViewportSize({ width: w, height: h })
      await expect.poll(async () => (await header.boundingBox())!.height, { message: `${w}px wide` }).toBeLessThan(70)
    }
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the formation bar can be hidden for a bigger stage, without sideways scrolling', async ({ page }) => {
    await createProject(page)
    const before = await canvasBox(page)
    await page.getByRole('button', { name: 'Hide formation bar' }).click()
    await expect.poll(async () => (await canvasBox(page)).height).toBeGreaterThan(before.height + 80)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await expect(page.getByRole('button', { name: 'Show formation bar' })).toBeVisible()
  })

  test('the header is two rows (name row + tabs), not three', async ({ page }) => {
    await createProject(page)
    const height = await page.locator('header').evaluate((el) => el.getBoundingClientRect().height)
    expect(height).toBeLessThan(110)
  })

  test('there is no desktop sidebar toggle (the Dancers drawer is used instead)', async ({ page }) => {
    await createProject(page)
    await expect(page.getByRole('button', { name: 'Hide dancer panel' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Dancers', exact: true })).toBeVisible()
  })
})
