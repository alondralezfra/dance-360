import { expect, test } from '@playwright/test'
import { addDancer, createProject } from './helpers'

test.describe('theme', () => {
  test('toggles dark mode, recolors the UI, and remembers the choice', async ({ page }) => {
    await createProject(page)
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const lightBg = await bg()

    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await bg()).not.toBe(lightBg)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Switch to light theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('follows the system preference on first visit', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await context.close()
  })

  test('the theme is available on the projects home too', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Switch to/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/)
  })
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the dancer panel is a drawer that opens and closes', async ({ page }) => {
    await createProject(page)
    await expect(page.getByPlaceholder('Dancer name')).toBeHidden()

    await page.getByRole('button', { name: 'Dancers' }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByPlaceholder('Dancer name')).toBeVisible()

    await drawer.getByPlaceholder('Dancer name').fill('Maya')
    await drawer.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(drawer.getByText('Dancers (1)')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('the page does not scroll sideways', async ({ page }) => {
    await createProject(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('buttons are comfortable touch targets', async ({ page }) => {
    await createProject(page)
    for (const name of ['Dancers', '+ New formation', 'Previous formation']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40)
    }
  })

  test('formations can be added and stepped through on a phone', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Dancers' }).click()
    await addDancer(page, 'Maya')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await expect(page.getByText('2 of 2')).toBeVisible()
  })
})

test.describe('desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the dancer panel is a sidebar, not a drawer', async ({ page }) => {
    await createProject(page)
    await expect(page.getByPlaceholder('Dancer name')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dancers', exact: true })).toBeHidden()
  })
})

test.describe('project tabs', () => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 780 }]) {
    test(`have no stray scrollbar at ${viewport.width}px wide`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await createProject(page)
      const overflow = await page.getByRole('navigation', { name: 'Project sections' }).evaluate((el) => ({
        x: el.scrollWidth - el.clientWidth,
        y: el.scrollHeight - el.clientHeight,
        bar: el.offsetHeight - el.clientHeight, // room taken by a drawn scrollbar
      }))
      expect(overflow.y).toBe(0)
      expect(overflow.bar).toBe(0)
      // On a phone the tabs scroll sideways when they do not all fit (decision 0027), with no scrollbar drawn.
      if (viewport.width >= 768) expect(overflow.x).toBe(0)
    })
  }
})
