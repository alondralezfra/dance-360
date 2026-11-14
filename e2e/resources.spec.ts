import { expect, test, type Page } from '@playwright/test'
import { addLink, createProject, goToCast, goToResources, savedProject, tabFullyInView, waitForSaved } from './helpers'

// The Resources tab: links to videos and documents, attached to a section and/or part, saved with the project.

const TUTORIAL = 'https://tutorials.example.test/chorus'

/** The saved project's links, once autosave has caught up. */
async function savedLinks(page: Page) {
  await waitForSaved(page)
  return (await savedProject(page)).resources as Record<string, unknown>[]
}

test.describe('links', () => {
  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await goToResources(page)
  })

  test('start with an empty list that says how to add one', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Links' })).toBeVisible()
    await expect(page.getByText(/No links yet/)).toBeVisible()
  })

  test('are added by pasting an address, saved with the project, and still there after a reload', async ({ page }) => {
    await addLink(page, 'tutorials.example.test/chorus', 'Chorus tutorial')
    await expect(page.getByLabel('Title of link 1')).toHaveValue('Chorus tutorial')
    await expect(page.getByLabel('Web address of link 1')).toHaveValue(TUTORIAL)
    expect(await savedLinks(page)).toMatchObject([{ title: 'Chorus tutorial', url: TUTORIAL, kind: 'other', sectionId: null, partId: null, startSec: null }])

    await page.reload()
    await expect(page.getByLabel('Title of link 1')).toHaveValue('Chorus tutorial')
    await expect(page.getByLabel('Web address of link 1')).toHaveValue(TUTORIAL)
  })

  test('refuse an address that is not a web link, and say why', async ({ page }) => {
    await addLink(page, 'javascript:alert(1)', 'Sneaky')
    await expect(page.getByRole('alert')).toContainText('not a web link')
    await expect(page.getByLabel('Title of link 1')).toHaveCount(0)
    expect(await savedLinks(page)).toEqual([])
  })

  test('take a kind, a section, a part and a start time, and keep them across a reload', async ({ page }) => {
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click()
    await page.getByRole('button', { name: '+ Add section' }).click()
    await goToResources(page)
    await addLink(page, TUTORIAL, 'Chorus tutorial')

    await page.getByLabel('Kind of link 1').selectOption('tutorial')
    await page.getByLabel('Section of link 1').selectOption('Section 2')
    await page.getByLabel('Part of link 1').selectOption('Part A')
    await page.getByLabel('Start time of link 1').fill('1:23')
    await page.getByLabel('Start time of link 1').blur()
    await expect(page.getByRole('heading', { level: 3, name: 'Section 2' })).toBeVisible()
    await expect(page.getByLabel('Start time of link 1')).toHaveValue('1:23')

    const [link] = await savedLinks(page)
    expect(link).toMatchObject({ kind: 'tutorial', startSec: 83 })
    expect(link.sectionId).not.toBeNull()
    expect(link.partId).not.toBeNull()

    await page.reload()
    await expect(page.getByLabel('Kind of link 1')).toHaveValue('tutorial')
    await expect(page.getByLabel('Section of link 1')).not.toHaveValue('')
    await expect(page.getByLabel('Part of link 1')).not.toHaveValue('')
    await expect(page.getByLabel('Start time of link 1')).toHaveValue('1:23')
  })

  test('stay when the section they are about is removed, as links about the whole dance', async ({ page }) => {
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add section' }).click()
    await goToResources(page)
    await addLink(page, TUTORIAL, 'Chorus tutorial')
    await page.getByLabel('Section of link 1').selectOption('Section 2')
    await expect(page.getByRole('heading', { level: 3, name: 'Section 2' })).toBeVisible()

    await goToCast(page)
    await page.getByRole('button', { name: /^Remove Section 2/ }).click()
    await goToResources(page)
    await expect(page.getByLabel('Title of link 1')).toHaveValue('Chorus tutorial')
    await expect(page.getByRole('heading', { level: 3, name: 'Whole dance' })).toBeVisible()
    await expect(page.getByLabel('Section of link 1')).toHaveValue('')
  })

  test('are corrected in place, and a bad correction puts the old address back', async ({ page }) => {
    await addLink(page, TUTORIAL, 'Chorus tutorial')
    const address = page.getByLabel('Web address of link 1')
    await address.fill('javascript:alert(1)')
    await address.blur()
    await expect(address).toHaveValue(TUTORIAL)
    await address.fill('tutorials.example.test/verse')
    await address.blur()
    await expect(address).toHaveValue('https://tutorials.example.test/verse')
    expect(await savedLinks(page)).toMatchObject([{ url: 'https://tutorials.example.test/verse' }])
  })

  test('are removed, and adding and removing can be undone and redone', async ({ page }) => {
    await addLink(page, TUTORIAL, 'Chorus tutorial')
    await expect(page.getByLabel('Title of link 1')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByLabel('Title of link 1')).toHaveCount(0)
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByLabel('Title of link 1')).toHaveValue('Chorus tutorial')

    await page.getByRole('button', { name: 'Remove Chorus tutorial' }).click()
    await expect(page.getByLabel('Title of link 1')).toHaveCount(0)
    expect(await savedLinks(page)).toEqual([])
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByLabel('Title of link 1')).toHaveValue('Chorus tutorial')
  })

  test('open in a new tab that cannot reach back into the app', async ({ page }) => {
    await page.context().route('https://tutorials.example.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Tutorial</title><p>a stand-in for the real site</p>' }),
    )
    await addLink(page, TUTORIAL, 'Chorus tutorial')
    const [tab] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Open Chorus tutorial in a new tab' }).click()])
    await tab.waitForLoadState()
    expect(tab.url()).toBe(TUTORIAL)
    expect(await tab.evaluate(() => window.opener)).toBeNull()
    await expect(page.getByLabel('Title of link 1')).toBeVisible() // the app is still where it was
  })

  test('have no console errors during normal use', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await addLink(page, TUTORIAL, 'Chorus tutorial')
    await page.getByLabel('Kind of link 1').selectOption('document')
    await page.getByRole('button', { name: 'Remove Chorus tutorial' }).click()
    expect(errors).toEqual([])
  })
})

test.describe('the Resources tab on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('fits the screen, with touch-sized controls', async ({ page }) => {
    await createProject(page)
    await goToResources(page)
    await addLink(page, TUTORIAL, 'Chorus tutorial')
    await expect(page.getByLabel('Title of link 1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

    const controls = [
      page.getByRole('button', { name: '+ Add link' }),
      page.getByRole('link', { name: 'Open Chorus tutorial in a new tab' }),
      page.getByRole('button', { name: 'Remove Chorus tutorial' }),
      page.getByLabel('Kind of link 1'),
      page.getByLabel('Section of link 1'),
      page.getByLabel('Part of link 1'),
      page.getByLabel('Start time of link 1'),
    ]
    for (const control of controls) {
      const box = (await control.boundingBox())!
      const name = (await control.getAttribute('aria-label')) ?? (await control.textContent())
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40)
      expect(box.x, `${name} left edge`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `${name} right edge`).toBeLessThanOrEqual(390)
    }
  })

  test('opening the address directly shows the Resources tab fully in view', async ({ page }) => {
    await createProject(page)
    await page.goto(page.url().replace(/\/stage$/, '/resources'))
    const nav = page.getByRole('navigation', { name: 'Project sections' })
    await expect(nav.getByRole('link', { name: 'Resources' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => tabFullyInView(nav)).toBe(true)
  })
})
