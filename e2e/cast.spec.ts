import { expect, test } from '@playwright/test'
import {
  addDancer,
  createProject,
  dotColor,
  expectColor,
  goToCast,
  goToStage,
  resetStorage,
  rgb,
  savedProject,
  waitForSaved,
} from './helpers'

// Where the first dancer added is placed (see defaultSpot): x = 40/9 ft, y = 21 ft.
const FIRST_SPOT = { x: 40 / 9, y: 21 }

test.describe('navigation', () => {
  test('switches between Stage and Cast & Parts without losing anything', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')

    await goToCast(page)
    await expect(page.getByRole('link', { name: 'Cast & Parts' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Parts' })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: 'Maya' })).toBeVisible()

    await goToStage(page)
    await expect(page.getByRole('link', { name: 'Stage', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByLabel('Dancer name')).toHaveValue('Maya')

    await page.goBack()
    await expect(page).toHaveURL(/\/cast$/)
  })

  test('the Cast & Parts page can be opened directly and survives a reload', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Assignments' })).toBeVisible()
  })

  test('with no dancers, the grid points you back to the stage', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await page.getByRole('link', { name: 'Add dancers on the Stage tab' }).click()
    await expect(page).toHaveURL(/\/stage$/)
  })
})

test.describe('parts and sections', () => {
  test.beforeEach(async ({ page }) => {
    await createProject(page)
    await goToCast(page)
  })

  test('a new project starts with an Everyone part and Section 1', async ({ page }) => {
    await expect(page.getByLabel('Name of part 1')).toHaveValue('Everyone')
    await expect(page.getByLabel('Name of section 1')).toHaveValue('Section 1')
    await expect(page.getByText('Starts at Set 1 · Count 1')).toBeVisible()
  })

  test('adds, renames, recolours and removes parts, and saves them', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add part' }).click()
    await expect(page.getByLabel('Name of part 2')).toHaveValue('Part A')

    await page.getByLabel('Name of part 2').fill('Floor')
    await page.getByLabel('Colour of part 2').selectOption('green')
    await waitForSaved(page)
    let saved = await savedProject(page)
    expect(saved.parts.map((p: { name: string; color: string }) => [p.name, p.color])).toEqual([
      ['Everyone', 'blue'],
      ['Floor', 'green'],
    ])

    await page.getByRole('button', { name: 'Remove Floor' }).click()
    await expect(page.getByLabel('Name of part 2')).toHaveCount(0)
    await waitForSaved(page)
    saved = await savedProject(page)
    expect(saved.parts).toHaveLength(1)
  })

  test('stops adding parts at the maximum', async ({ page }) => {
    const add = page.getByRole('button', { name: '+ Add part' })
    for (let i = 0; i < 7; i++) await add.click()
    await expect(add).toBeDisabled()
    await expect(page.getByText('8 parts is the maximum.')).toBeVisible()
  })

  test('adds a section and moves where it starts', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add section' }).click()
    const start = page.getByRole('group', { name: 'Start of section 2' })
    await expect(start.getByLabel('Set')).toHaveValue('3')

    await page.getByLabel('Name of section 2').fill('Chorus')
    await start.getByLabel('Set').fill('4')
    await start.getByLabel('Set').press('Enter')
    await waitForSaved(page)

    const saved = await savedProject(page)
    expect(saved.sections.map((s: { name: string; startCount: number }) => [s.name, s.startCount])).toEqual([
      ['Section 1', 0],
      ['Chorus', 24],
    ])
  })

  test('cannot remove the only section', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Remove Section 1' })).toBeDisabled()
  })
})

test.describe('assigning dancers', () => {
  test('flags missing assignments, then clears them as people are assigned, and persists', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await addDancer(page, 'Jordan')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one

    const status = page.getByRole('status').filter({ hasText: /assignment|Everyone/ })
    await expect(status).toHaveText('2 missing assignments')
    await expect(page.getByText('Maya has no part in Section 1')).toBeVisible()

    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await expect(status).toHaveText('1 missing assignment')
    await page.getByLabel('Jordan, Section 1').selectOption({ label: 'Everyone' })
    await expect(status).toHaveText('No missing assignments.')

    await waitForSaved(page)
    await page.reload()
    await expect(page.getByLabel('Maya, Section 1')).toHaveValue(/.+/)
    await expect(status).toHaveText('No missing assignments.')
  })

  test('a new section copies the previous one, and a new dancer starts unassigned', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })

    await page.getByRole('button', { name: '+ Add section' }).click()
    await expect(page.getByLabel('Maya, Section 2')).toHaveValue(await page.getByLabel('Maya, Section 1').inputValue())

    await goToStage(page)
    await addDancer(page, 'Jordan')
    await goToCast(page)
    await expect(page.getByLabel('Jordan, Section 1')).toHaveValue('')
    await expect(page.getByText('Jordan has no part in Section 2')).toBeVisible()
  })

  test('removing a part that is in use asks first and then flags those dancers', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })

    let message = ''
    page.once('dialog', (d) => {
      message = d.message()
      void d.dismiss()
    })
    await page.getByRole('button', { name: 'Remove Everyone' }).click()
    expect(message).toContain('1 assignment will be cleared')
    await expect(page.getByRole('button', { name: 'Remove Everyone' })).toBeVisible() // cancelled: still there

    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: 'Remove Everyone' }).click()
    await expect(page.getByRole('button', { name: 'Remove Everyone' })).toHaveCount(0)
    await expect(page.getByText('Maya has no part in Section 1')).toBeVisible()
  })

  test('removing a dancer on the stage removes their assignments', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await goToStage(page)
    await page.getByRole('button', { name: 'Remove Maya' }).click()
    await waitForSaved(page)
    const saved = await savedProject(page)
    expect(Object.values(saved.assignments).every((byDancer) => Object.keys(byDancer as object).length === 0)).toBe(true)
  })
})

test.describe('part colours on the stage', () => {
  test('an unassigned dancer is neutral; assigning a part colours the dot; changing the colour follows', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')

    // with a single part everyone is in it automatically; a second part is what makes dancers need picking
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await goToStage(page)
    expectColor(await dotColor(page, FIRST_SPOT), rgb('#94a3b8')) // no part chosen yet

    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await goToStage(page)
    expectColor(await dotColor(page, FIRST_SPOT), rgb('#0072b2')) // blue

    await goToCast(page)
    await page.getByLabel('Colour of part 1').selectOption('green')
    await goToStage(page)
    expectColor(await dotColor(page, FIRST_SPOT), rgb('#009e73'))
  })

  test('the dot colour uses the dark-theme palette in dark mode', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await goToStage(page)
    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#3d9be0').join(','))
  })

  test('a dancer changes colour when the dance moves into a section where they are in another part', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')

    // Section 2 starts at Set 3; Maya is in Everyone in section 1 and Part A (a new colour) in section 2.
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click()
    await page.getByLabel('Colour of part 2').selectOption('red')
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await page.getByLabel('Maya, Section 2').selectOption({ label: 'Part A' })

    // Formation 1 sits in section 1; put formation 2 at Set 3 (count 16), inside section 2.
    await goToStage(page)
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByLabel('Set', { exact: true }).fill('3')
    await page.getByLabel('Set', { exact: true }).press('Enter')
    await expect(page.getByRole('group', { name: 'Parts legend' })).toContainText('Section 2')
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#d55e00').join(','))

    await page.getByRole('button', { name: 'Previous formation' }).click()
    await expect(page.getByRole('group', { name: 'Parts legend' })).toContainText('Section 1')
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#0072b2').join(','))
  })

  test('the dancer list dot and the legend show the same part colours', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await goToStage(page)

    await expect(page.getByRole('img', { name: 'Everyone' })).toBeVisible()
    const legend = page.getByRole('group', { name: 'Parts legend' })
    await expect(legend).toContainText('Section 1')
    await expect(legend).toContainText('Everyone')
  })

  test('selecting a dancer rings them without hiding their part colour', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
    await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
    await goToStage(page)

    // Select in the dancer list. (A bare listitem would also match the Cast page's lists while the route is still changing.)
    await page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Remove Maya' }) }).click()
    expectColor(await dotColor(page, FIRST_SPOT), rgb('#0072b2')) // fill unchanged
  })
})

test.describe('upgrading older saved projects', () => {
  test('a version-1 project (from before parts existed) opens with everyone already in Part A', async ({ page }) => {
    await resetStorage(page)
    await page.evaluate(() =>
      localStorage.setItem(
        'dance360:project:old-v1',
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          project: {
            name: 'Before parts',
            stage: { width: 40, depth: 24 },
            tempo: { bpm: 120, startOffsetSec: 0 },
            dancers: [{ id: 'd1', name: 'Maya' }],
            formations: [
              { id: 'f1', name: 'Opening', count: 0, transitionCounts: 4, positions: { d1: { x: 10, y: 12 } } },
            ],
          },
        }),
      ),
    )
    await page.goto('/projects/old-v1/stage')
    await expect(page.getByLabel('Project name')).toHaveValue('Before parts')
    await expect(page.getByRole('group', { name: 'Parts legend' })).toContainText('Part A')
    expectColor(await dotColor(page, { x: 10, y: 12 }), rgb('#0072b2'))

    await goToCast(page)
    await expect(page.getByRole('status').filter({ hasText: 'No missing assignments' })).toBeVisible()
    // one part applies everywhere, so Maya is in it automatically: no dropdown, nothing to pick
    await expect(page.getByLabel('Maya, Section 1')).toHaveCount(0)
  })
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the page does not scroll sideways, even with a wide grid', async ({ page }) => {
    await createProject(page)
    await page.getByRole('button', { name: 'Dancers' }).click()
    await addDancer(page, 'Maya')
    await page.keyboard.press('Escape')
    await goToCast(page)
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+ Add section' }).click()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    // the grid scrolls inside its own container instead
    const scrollable = await page.locator('table').evaluate((t) => t.parentElement!.scrollWidth > t.parentElement!.clientWidth)
    expect(scrollable).toBe(true)
  })

  test('rows fit the screen and labels do not wrap awkwardly', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add section' }).click()

    // every part and section row sits fully inside the viewport
    const rows = await page.locator('section ul > li').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().right - window.innerWidth),
    )
    expect(rows.length).toBeGreaterThanOrEqual(3)
    for (const overhang of rows) expect(overhang).toBeLessThanOrEqual(0)

    // buttons and the header title stay on one line
    for (const name of ['+ Add part', '+ Add section']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height, `${name} wrapped`).toBeLessThanOrEqual(48)
    }
    const title = (await page.getByRole('link', { name: 'Dance 360' }).boundingBox())!
    expect(title.height, 'header title wrapped').toBeLessThanOrEqual(32)
  })

  test('tabs and cast controls are comfortable touch targets', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    for (const name of ['Stage', 'Cast & Parts']) {
      const box = (await page.getByRole('link', { name, exact: true }).boundingBox())!
      expect(box.height, `${name} tab height`).toBeGreaterThanOrEqual(40)
    }
    for (const name of ['+ Add part', '+ Add section']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(40)
    }
  })
})
