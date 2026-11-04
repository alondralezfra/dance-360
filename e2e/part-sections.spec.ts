import { expect, test, type Page } from '@playwright/test'
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

const FIRST_SPOT = { x: 40 / 9, y: 21 }
const status = (page: Page) => page.getByRole('status').filter({ hasText: /assignment|Everyone/ })

/** Sections Intro, Chorus 1, Verse, Chorus 2 (starting at counts 0, 16, 32, 48) and parts Everyone, Floor, Standing. */
async function buildSong(page: Page) {
  await page.getByLabel('Name of section 1').fill('Intro')
  for (const [n, name] of [
    [2, 'Chorus 1'],
    [3, 'Verse'],
    [4, 'Chorus 2'],
  ] as const) {
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByLabel(`Name of section ${n}`).fill(name)
  }
  await page.getByRole('button', { name: '+ Add part' }).click()
  await page.getByRole('button', { name: '+ Add part' }).click()
  await page.getByLabel('Name of part 2').fill('Floor')
  await page.getByLabel('Name of part 3').fill('Standing')
}

/** Open a part's sections dropdown, tick the named sections, close it. */
async function limitPartTo(page: Page, partNumber: number, sections: string[]) {
  await page.getByRole('button', { name: `Sections of part ${partNumber}` }).click()
  const dialog = page.getByRole('dialog', { name: `Sections of part ${partNumber}` })
  for (const name of sections) await dialog.getByRole('checkbox', { name }).check()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

test.describe('parts limited to specific sections', () => {
  test('Floor and Standing only in the choruses: no missing-assignment errors anywhere else', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await addDancer(page, 'Jordan')
    await goToCast(page)
    await buildSong(page)

    // Before limiting, all three parts apply everywhere, so every section needs choices.
    await expect(status(page)).toHaveText('8 missing assignments')

    await limitPartTo(page, 2, ['Chorus 1', 'Chorus 2'])
    await limitPartTo(page, 3, ['Chorus 1', 'Chorus 2'])
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/Chorus 1, Chorus 2/)

    // Intro and Verse have only Everyone: everyone is in it automatically, nothing to pick, nothing flagged.
    await expect(status(page)).toHaveText('4 missing assignments') // just the 2 dancers x 2 choruses
    await expect(page.getByText(/has no part in (Intro|Verse)/)).toHaveCount(0)
    await expect(page.getByLabel('Maya, Intro')).toHaveCount(0)
    await expect(page.getByLabel('Jordan, Verse')).toHaveCount(0)

    // The chorus cells offer only Floor and Standing (Everyone is replaced there).
    await expect(page.getByLabel('Maya, Chorus 1').locator('option')).toHaveText(['No part', 'Floor', 'Standing'])

    for (const dancer of ['Maya', 'Jordan']) {
      for (const section of ['Chorus 1', 'Chorus 2']) {
        await page.getByLabel(`${dancer}, ${section}`).selectOption({ label: dancer === 'Maya' ? 'Floor' : 'Standing' })
      }
    }
    await expect(status(page)).toHaveText('No missing assignments.')

    // Saved, and still true after a reload.
    await waitForSaved(page)
    const saved = await savedProject(page)
    const byName = (name: string) => saved.parts.find((p: { name: string }) => p.name === name)
    expect(byName('Everyone').sectionIds).toBeNull()
    expect(byName('Floor').sectionIds).toHaveLength(2)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/Chorus 1, Chorus 2/)
    await expect(status(page)).toHaveText('No missing assignments.')
  })

  test('"All sections" puts a part back everywhere', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await buildSong(page)
    await limitPartTo(page, 2, ['Chorus 1'])
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/Chorus 1/)

    await page.getByRole('button', { name: 'Sections of part 2' }).click()
    await page.getByRole('dialog').getByRole('checkbox', { name: 'All sections' }).check()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/All sections/)
  })

  test('a section covered by only one part shows it read-only; adding a part there brings the dropdowns back', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await expect(page.getByLabel('Maya, Section 1')).toHaveCount(0) // one part: automatic
    await expect(page.getByRole('table').getByText('Everyone').first()).toBeVisible()

    await page.getByRole('button', { name: '+ Add part' }).click()
    await expect(page.getByLabel('Maya, Section 1')).toBeVisible() // two parts: needs a choice
    await expect(status(page)).toHaveText('1 missing assignment')
  })

  test('a part left with no sections shows "No sections" and does not apply anywhere', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await buildSong(page)
    await limitPartTo(page, 2, ['Chorus 1'])
    await page.getByRole('button', { name: 'Remove Chorus 1' }).click()
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/No sections/)
  })

  test('removing a section only removes it from the parts that listed it', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await buildSong(page)
    await limitPartTo(page, 2, ['Chorus 1', 'Chorus 2'])
    await page.getByRole('button', { name: 'Remove Chorus 1' }).click()
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/Chorus 2/)
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).not.toHaveText(/Chorus 1/)
  })

  test('a new section keeps the previous section’s parts (a Chorus 3 straight after Chorus 2)', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await buildSong(page)
    await limitPartTo(page, 2, ['Chorus 2'])
    await limitPartTo(page, 3, ['Chorus 2'])

    await page.getByRole('button', { name: '+ Add section' }).click()
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/Chorus 2, Section 5/)
    await expect(page.getByRole('button', { name: 'Sections of part 3' })).toHaveText(/Chorus 2, Section 5/)
    await expect(page.getByRole('button', { name: 'Sections of part 1' })).toHaveText(/All sections/)
  })
})

test.describe('a section no part applies in', () => {
  test('Floor and Standing only in Verse 1 leave the Chorus uncovered, and that is not an error', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await addDancer(page, 'Jordan')
    await goToCast(page)
    await page.getByLabel('Name of section 1').fill('Verse 1')
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByLabel('Name of section 2').fill('Chorus')

    // Turn the default part into Floor, add Standing, and limit both to Verse 1.
    await page.getByLabel('Name of part 1').fill('Floor')
    await page.getByRole('button', { name: '+ Add part' }).click()
    await page.getByLabel('Name of part 2').fill('Standing')
    await limitPartTo(page, 1, ['Verse 1'])
    await limitPartTo(page, 2, ['Verse 1'])

    // Only Verse 1 needs choices; the Chorus has no part to choose, so nothing is flagged there.
    await expect(status(page)).toHaveText('2 missing assignments')
    await expect(page.getByText(/has no part in Chorus/)).toHaveCount(0)
    await expect(page.getByLabel('Maya, Chorus')).toHaveCount(0) // no dead-end dropdown
    await expect(page.getByRole('table').getByText('Everyone').first()).toBeVisible()

    await page.getByLabel('Maya, Verse 1').selectOption({ label: 'Floor' })
    await page.getByLabel('Jordan, Verse 1').selectOption({ label: 'Standing' })
    await expect(status(page)).toHaveText('No missing assignments.')

    // On the stage the Chorus shows neutral dots and the legend says "Everyone".
    await goToStage(page)
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByLabel('Set', { exact: true }).fill('3') // count 16: the Chorus starts there
    await page.getByLabel('Set', { exact: true }).press('Enter')
    const legend = page.getByRole('group', { name: 'Parts legend' })
    await expect(legend).toContainText('Chorus')
    await expect(legend).toContainText('Everyone')
    await expect(legend).not.toContainText('Floor')
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#94a3b8').join(','))
  })

  test('adding a part that covers the uncovered section makes it a normal section again', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await page.getByRole('button', { name: '+ Add section' }).click()
    await page.getByLabel('Name of section 2').fill('Chorus')
    await limitPartTo(page, 1, ['Section 1']) // the default part now covers section 1 only; Chorus is uncovered
    await expect(page.getByLabel('Maya, Chorus')).toHaveCount(0)

    await page.getByRole('button', { name: '+ Add part' }).click() // a new all-sections part covers the Chorus
    await expect(page.getByText(/Maya, Chorus: automatic/)).toHaveCount(1) // only one part applies there
  })
})

test.describe('on the stage', () => {
  test('dots and the legend follow the sections: Everyone in the intro, Floor/Standing in the chorus', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await buildSong(page)
    await limitPartTo(page, 2, ['Chorus 1', 'Chorus 2'])
    await limitPartTo(page, 3, ['Chorus 1', 'Chorus 2'])
    await page.getByLabel('Maya, Chorus 1').selectOption({ label: 'Floor' }) // Floor is red, Everyone is blue

    await goToStage(page)
    // Formation 1 is at count 0 (Intro): only Everyone applies, so Maya is in it with no assignment.
    const legend = page.getByRole('group', { name: 'Parts legend' })
    await expect(legend).toContainText('Intro')
    await expect(legend).toContainText('Everyone')
    await expect(legend).not.toContainText('Floor')
    expectColor(await dotColor(page, FIRST_SPOT), rgb('#0072b2'))

    // Formation 2 at Set 3 (count 16) is inside Chorus 1: Floor and Standing apply, and Maya is in Floor.
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByLabel('Set', { exact: true }).fill('3')
    await page.getByLabel('Set', { exact: true }).press('Enter')
    await expect(legend).toContainText('Chorus 1')
    await expect(legend).toContainText('Floor')
    await expect(legend).toContainText('Standing')
    await expect(legend).not.toContainText('Everyone')
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#d55e00').join(','))

    await page.getByRole('button', { name: 'Previous formation' }).click()
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#0072b2').join(','))
  })

  test('a dancer not yet picked in a chorus is neutral there', async ({ page }) => {
    await createProject(page)
    await addDancer(page, 'Maya')
    await goToCast(page)
    await buildSong(page)
    await limitPartTo(page, 2, ['Chorus 1'])
    await limitPartTo(page, 3, ['Chorus 1'])

    await goToStage(page)
    await page.getByRole('button', { name: '+ New formation' }).click()
    await page.getByLabel('Set', { exact: true }).fill('3')
    await page.getByLabel('Set', { exact: true }).press('Enter')
    await expect.poll(() => dotColor(page, FIRST_SPOT).then((c) => c.join(','))).toBe(rgb('#94a3b8').join(','))
  })
})

test.describe('upgrading older saved projects', () => {
  test('a version-2 project (before parts could be limited) keeps every part on all sections', async ({ page }) => {
    await resetStorage(page)
    await page.evaluate(() =>
      localStorage.setItem(
        'dance360:project:old-v2',
        JSON.stringify({
          version: 2,
          updatedAt: Date.now(),
          project: {
            name: 'Before scoping',
            stage: { width: 40, depth: 24 },
            tempo: { bpm: 120, startOffsetSec: 0 },
            dancers: [{ id: 'd1', name: 'Maya' }],
            formations: [{ id: 'f1', name: 'Opening', count: 0, transitionCounts: 4, positions: { d1: { x: 10, y: 12 } } }],
            parts: [
              { id: 'pa', name: 'Part A', color: 'blue' },
              { id: 'pb', name: 'Part B', color: 'red' },
            ],
            sections: [{ id: 's1', name: 'Intro', startCount: 0 }],
            assignments: { s1: { d1: 'pb' } },
          },
        }),
      ),
    )
    await page.goto('/projects/old-v2/cast')
    await expect(page.getByRole('button', { name: 'Sections of part 1' })).toHaveText(/All sections/)
    await expect(page.getByRole('button', { name: 'Sections of part 2' })).toHaveText(/All sections/)
    await expect(page.getByLabel('Maya, Intro')).toHaveValue('pb') // their choice survived the upgrade
    await expect(status(page)).toHaveText('No missing assignments.')

    await goToStage(page)
    expectColor(await dotColor(page, { x: 10, y: 12 }), rgb('#d55e00')) // Part B (red)
  })
})

test.describe('using the sections dropdown', () => {
  test('works from the keyboard: Enter opens, Space ticks, Escape closes and returns focus', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await buildSong(page)

    const trigger = page.getByRole('button', { name: 'Sections of part 2' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Sections of part 2' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('checkbox', { name: 'Chorus 1' }).focus()
    await page.keyboard.press('Space')
    await expect(dialog.getByRole('checkbox', { name: 'Chorus 1' })).toBeChecked()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveText(/Chorus 1/)
  })

  test('closes when you click elsewhere', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await page.getByRole('button', { name: 'Sections of part 1' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('heading', { name: 'Sections' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the dropdown fits on screen with touch-sized rows, and the page does not scroll sideways', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    await buildSong(page)
    await page.getByRole('button', { name: 'Sections of part 2' }).click()

    const dialog = page.getByRole('dialog', { name: 'Sections of part 2' })
    await expect(dialog).toBeVisible()
    const box = (await dialog.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)

    for (const name of ['All sections', 'Intro', 'Chorus 2']) {
      const row = dialog.locator('label', { hasText: name }).first()
      expect((await row.boundingBox())!.height, `${name} row`).toBeGreaterThanOrEqual(40)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    // and it can be used by touch
    await dialog.getByText('Chorus 1').tap()
    await expect(dialog.getByRole('checkbox', { name: 'Chorus 1' })).toBeChecked()
  })

  test('part rows wrap instead of running off the screen, now with the sections control in them', async ({ page }) => {
    await createProject(page)
    await goToCast(page)
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '+ Add part' }).click()
    const overhangs = await page.locator('section ul > li').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().right - window.innerWidth),
    )
    for (const overhang of overhangs) expect(overhang).toBeLessThanOrEqual(0)
  })
})
