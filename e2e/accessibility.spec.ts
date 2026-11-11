import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { addDancer, beatsWav, chooseFile, createProject, goToCast, goToSong, waitForSaved } from './helpers'

// An automated accessibility scan of every screen and its open states (menus, dialogs, panels), in the
// light and dark themes, on a desktop and a phone, against WCAG 2.1 levels A and AA (decisions/0023).
// A violation fails the test; the message names the rule, the element and why. This finds the machine-checkable
// problems (contrast, names, roles, structure); it does not replace trying the app with a keyboard or screen reader.

const STANDARD = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Fails, listing every problem, if the page as it is now breaks the standard. */
async function expectAccessible(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(STANDARD).analyze()
  const report = violations.map((v) => {
    const first = v.nodes[0]
    const why = first?.any[0]?.message ?? first?.all[0]?.message ?? first?.none[0]?.message ?? ''
    return `${v.impact} · ${v.id} (${v.nodes.length}): ${v.help}\n    e.g. ${first?.target.join(' ')}\n    ${why}`
  })
  expect(report, `${where} has accessibility problems:\n${report.join('\n')}`).toEqual([])
}

const themes = ['light', 'dark'] as const
const sizes = [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 780 }],
] as const

for (const scheme of themes) {
  for (const [sizeName, size] of sizes) {
    const where = (screen: string) => `${screen} (${scheme}, ${sizeName})`

    test.describe(`${scheme} theme on a ${sizeName}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme })
      })

      test('the projects home, the stage, and the cast and song screens', async ({ page }) => {
        test.setTimeout(90_000)
        // Set the project up on a wide screen (the dancer panel is a sidebar there), then look at it at the size under test.
        await page.setViewportSize({ width: 1280, height: 900 })
        await createProject(page)
        await addDancer(page, 'Maya')
        await addDancer(page, 'Jo')
        await page.getByRole('button', { name: '+ New formation' }).click()
        await waitForSaved(page)
        await page.setViewportSize(size)

        await page.goto('/')
        await expect(page.getByRole('link', { name: /Untitled dance/ })).toBeVisible()
        await expectAccessible(page, where('the projects home'))

        await page.getByRole('link', { name: /Untitled dance/ }).click()
        await page.waitForURL(/\/stage$/)
        await expect(page.getByLabel('Formation name')).toBeVisible()
        await expectAccessible(page, where('the stage'))

        if (sizeName === 'phone') {
          await page.getByRole('button', { name: 'Dancers' }).click()
          await expect(page.getByRole('dialog')).toBeVisible()
          await expectAccessible(page, where('the dancer drawer'))
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toBeHidden()
        }

        await goToCast(page)
        await page.getByRole('button', { name: '+ Add part' }).click()
        await expectAccessible(page, where('the cast and parts screen'))
        await page.getByRole('button', { name: /^Sections of part 2/ }).click()
        await expect(page.getByRole('dialog', { name: 'Sections of part 2' })).toBeVisible()
        await expectAccessible(page, where('the sections picker'))
        await page.keyboard.press('Escape')

        await goToSong(page)
        await expectAccessible(page, where('the song screen with no song'))
        await chooseFile(page, beatsWav({ bpm: 120, seconds: 20, firstBeatSec: 0.5 }, 'Groove.wav'))
        await page.getByRole('region', { name: 'Tempo' }).getByRole('status').waitFor({ timeout: 25_000 })
        await expectAccessible(page, where('the song screen with a song'))

        await page.getByRole('button', { name: 'Calibrate by tapping' }).click()
        await expect(page.getByRole('button', { name: 'Tap on each click' })).toBeEnabled()
        await expectAccessible(page, where('the speaker delay calibration'))
        await page.getByRole('button', { name: 'Cancel' }).click()
      })

      test('the error screen', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await createProject(page)
        await addDancer(page, 'Maya')
        await waitForSaved(page)
        const url = page.url()
        await page.evaluate(() => {
          const key = Object.keys(localStorage).find((k) => k.startsWith('dance360:project:'))!
          const record = JSON.parse(localStorage.getItem(key)!)
          record.project.dancers = 'not a list' // the dancer panel cannot draw this
          localStorage.setItem(key, JSON.stringify(record))
        })
        await page.setViewportSize(size)
        await page.goto(url)
        await expect(page.getByRole('alert')).toContainText('Something went wrong')
        await expectAccessible(page, where('the error screen'))
      })
    })
  }
}

test.describe('the page not found screen', () => {
  for (const scheme of themes) {
    test(`is accessible in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/no/such/page')
      await expect(page.getByText('Page not found.')).toBeVisible()
      await expectAccessible(page, `the not found screen (${scheme})`)
    })
  }
})
