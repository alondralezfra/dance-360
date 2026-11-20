import { expect, test } from '@playwright/test'
import { addDancer, createProject, goToResources, useWideFont } from './helpers'

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
  for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 780 }, { width: 360, height: 740 }]) {
    test(`all fit, with no scrolling or scrollbar, at ${viewport.width}px wide`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await createProject(page)
      await useWideFont(page)
      const overflow = await page.getByRole('navigation', { name: 'Project sections' }).evaluate((el) => {
        const style = getComputedStyle(el)
        return {
          x: el.scrollWidth - el.clientWidth,
          y: el.scrollHeight - el.clientHeight,
          // room taken by a drawn scrollbar (what is left of the height once the borders are taken off)
          bar: el.offsetHeight - el.clientHeight - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
        }
      })
      expect(overflow).toEqual({ x: 0, y: 0, bar: 0 })
    })
  }
})

// On a phone or tablet the tabs are a bar at the bottom of the screen, within thumb reach (plan 6.1, decision 0032); the
// project name has its own row beside Undo/Redo so it can be read.
test.describe('phone navigation', () => {
  for (const width of [390, 360]) {
    test.describe(`at ${width}px wide`, () => {
      test.use({ viewport: { width, height: 740 }, hasTouch: true })

      test('the tabs are a bar along the bottom edge, each a comfortable touch target', async ({ page }) => {
        await createProject(page)
        await useWideFont(page)
        const nav = page.getByRole('navigation', { name: 'Project sections' })
        const bar = (await nav.boundingBox())!
        expect(Math.abs(bar.y + bar.height - 740), 'the bar sits on the bottom edge').toBeLessThanOrEqual(1)
        expect(bar.width).toBeGreaterThanOrEqual(width - 1)
        const links = nav.getByRole('link')
        await expect(links).toHaveCount(5)
        for (const link of await links.all()) {
          const box = (await link.boundingBox())!
          expect(box.height, `${await link.textContent()} height`).toBeGreaterThanOrEqual(44)
          expect(box.x).toBeGreaterThanOrEqual(0)
          expect(box.x + box.width).toBeLessThanOrEqual(width)
        }
      })

      test('tapping each tab opens it, and the open one is marked', async ({ page }) => {
        await createProject(page)
        const nav = page.getByRole('navigation', { name: 'Project sections' })
        for (const [name, url] of [['Overview', /\/overview$/], ['Cast & Parts', /\/cast$/], ['Song', /\/song$/], ['Resources', /\/resources$/], ['Stage', /\/stage$/]] as const) {
          await nav.getByRole('link', { name }).tap()
          await expect(page).toHaveURL(url)
          await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
        }
      })

      test('the bar covers no content: the end of every tab can be scrolled above it', async ({ page }) => {
        await createProject(page)
        const nav = page.getByRole('navigation', { name: 'Project sections' })
        await goToResources(page)
        const barTop = (await nav.boundingBox())!.y
        const last = page.getByRole('region').last()
        await last.evaluate((el) => el.scrollIntoView({ block: 'end' }))
        const box = (await last.boundingBox())!
        expect(box.y + box.height).toBeLessThanOrEqual(barTop + 1)
      })

      test('the project name is readable and sits beside Undo and Redo', async ({ page }) => {
        await createProject(page)
        const name = (await page.getByLabel('Project name').boundingBox())!
        const undo = (await page.getByRole('button', { name: 'Undo' }).boundingBox())!
        const redo = (await page.getByRole('button', { name: 'Redo' }).boundingBox())!
        expect(name.width).toBeGreaterThanOrEqual(width - 140)
        expect(Math.abs(name.y - undo.y)).toBeLessThan(40) // the same row
        expect(redo.x + redo.width).toBeLessThanOrEqual(width)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
      })
    })
  }
})
