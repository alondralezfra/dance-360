import { expect, test } from '@playwright/test'
import { addDancer, createProject, savedProject, stagePixel, waitForSaved } from './helpers'

test.describe('stage editor', () => {
  test.beforeEach(async ({ page }) => {
    await createProject(page)
  })

  test('adds, renames and removes dancers', async ({ page }) => {
    await addDancer(page, 'Maya Lopez')
    await addDancer(page, 'Jordan Lee')
    await expect(page.getByText('Dancers (2)')).toBeVisible()

    const first = page.getByLabel('Dancer name').first()
    await first.fill('Maya L')
    await expect(first).toHaveValue('Maya L')

    await page.getByRole('button', { name: 'Remove Jordan Lee' }).click()
    await expect(page.getByText('Dancers (1)')).toBeVisible()
  })

  test('the Add button needs a name', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
  })

  test('creates, renames, retimes and steps through formations', async ({ page }) => {
    await addDancer(page, 'Maya')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await expect(page.getByText('2 of 2')).toBeVisible()
    await expect(page.getByLabel('Set', { exact: true })).toHaveValue('2')

    await page.getByLabel('Formation name').fill('Finale')
    await page.getByLabel('Set', { exact: true }).fill('5')
    await page.getByLabel('Set', { exact: true }).press('Enter')
    await page.getByLabel('Travel counts').fill('2')
    await page.getByLabel('Travel counts').press('Enter')

    await page.getByRole('button', { name: 'Previous formation' }).click()
    await expect(page.getByText('1 of 2')).toBeVisible()
    await expect(page.getByLabel('Set', { exact: true })).toHaveValue('1')
    await page.getByRole('button', { name: 'Next formation' }).click()
    await expect(page.getByLabel('Formation name')).toHaveValue('Finale')
    await expect(page.getByLabel('Set', { exact: true })).toHaveValue('5')
    await expect(page.getByLabel('Travel counts')).toHaveValue('2')
  })

  test('a blank or invalid timing entry reverts instead of breaking', async ({ page }) => {
    const set = page.getByLabel('Set', { exact: true })
    await set.fill('')
    await set.blur()
    await expect(set).toHaveValue('1')
    await set.fill('abc')
    await set.blur()
    await expect(set).toHaveValue('1')
  })

  test('cannot delete the last formation', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  test('dragging a dancer moves them, snaps to the grid, and is saved', async ({ page }) => {
    await addDancer(page, 'Maya')
    await waitForSaved(page)
    const before = (await savedProject(page)).formations[0].positions
    const id = Object.keys(before)[0]

    // New dancers start in a row across the front: first spot is x=40/9 ft, y=21 ft.
    const start = await stagePixel(page, before[id])
    const target = await stagePixel(page, { x: before[id].x + 10, y: before[id].y - 8 })
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move((start.x + target.x) / 2, (start.y + target.y) / 2, { steps: 5 })
    await page.mouse.move(target.x, target.y, { steps: 5 })
    await page.mouse.up()

    await expect.poll(async () => (await savedProject(page)).formations[0].positions[id].x).not.toBe(before[id].x)
    const after = (await savedProject(page)).formations[0].positions[id]
    expect(after.x).toBeCloseTo(before[id].x + 10, 0)
    expect(after.y).toBeCloseTo(before[id].y - 8, 0)
    // snapped to the 0.5 ft grid
    expect(after.x * 2).toBeCloseTo(Math.round(after.x * 2), 5)
    expect(after.y * 2).toBeCloseTo(Math.round(after.y * 2), 5)
  })

  test('dragging past the stage edge keeps the dancer on stage', async ({ page }) => {
    await addDancer(page, 'Maya')
    await waitForSaved(page)
    const before = (await savedProject(page)).formations[0].positions
    const id = Object.keys(before)[0]

    const start = await stagePixel(page, before[id])
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x - 2000, start.y + 2000, { steps: 8 })
    await page.mouse.up()

    await expect.poll(async () => (await savedProject(page)).formations[0].positions[id].x).toBe(0)
    expect((await savedProject(page)).formations[0].positions[id].y).toBe(24)
  })

  test('a move in one formation does not change the others', async ({ page }) => {
    await addDancer(page, 'Maya')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await waitForSaved(page)
    const before = await savedProject(page)
    const id = before.dancers[0].id
    const startFeet = before.formations[1].positions[id]

    const start = await stagePixel(page, startFeet)
    const target = await stagePixel(page, { x: startFeet.x + 8, y: startFeet.y - 6 })
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 10 })
    await page.mouse.up()

    await expect
      .poll(async () => (await savedProject(page)).formations[1].positions[id].x)
      .not.toBe(startFeet.x)
    const after = await savedProject(page)
    expect(after.formations[0].positions[id]).toEqual(before.formations[0].positions[id])
  })

  test('everything survives a reload', async ({ page }) => {
    await addDancer(page, 'Maya')
    await addDancer(page, 'Jordan')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByLabel('Formation name').fill('Finale')
    await page.getByLabel('Project name').fill('Reload Test')
    await waitForSaved(page)

    await page.reload()
    await expect(page.getByLabel('Project name')).toHaveValue('Reload Test')
    await expect(page.getByText('Dancers (2)')).toBeVisible()
    await expect(page.getByRole('button', { name: /Finale/ })).toBeVisible()
  })

  test('the stage canvas renders and is sized to its container', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = (await canvas.boundingBox())!
    expect(box.width).toBeGreaterThan(200)
    expect(box.height).toBeGreaterThan(150)
  })

  test('has no console errors during normal use', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))

    await addDancer(page, 'Maya')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByRole('button', { name: 'Previous formation' }).click()
    await page.waitForTimeout(900) // let the glide finish
    await page.reload()
    await expect(page.getByLabel('Project name')).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('crisp canvas', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  // Browser zoom (Ctrl +/-) changes the device pixel ratio. If the canvas keeps its old
  // resolution the browser stretches it and text and thin lines go blurry.
  test('the canvas re-renders at the new pixel ratio when the browser zooms', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    const cdp = await page.context().newCDPSession(page)
    for (const ratio of [2, 1.25, 1]) {
      // What zoom really does: a smaller CSS viewport on the same physical screen, at a higher ratio.
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: Math.round(1280 / ratio), height: Math.round(800 / ratio), deviceScaleFactor: ratio, mobile: false })
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.querySelectorAll('canvas')].map((c) => Math.round(c.width / c.getBoundingClientRect().width * 100) / 100),
          ),
        )
        .toEqual([ratio, ratio])
    }
  })
})
