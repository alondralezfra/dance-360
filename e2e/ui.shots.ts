import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { addDancer, addLink, addNote, beatsWav, chooseFile, createProject, goToCast, goToResources, goToSong, waitForSaved } from './helpers'

// Not a test of the app: photographs the main screens so they can be looked at (docs/components.md, "How the app
// looks"; the ui-styling skill in .claude/skills). Run `npm run screenshots`. The pictures are whole pages, named
// <screen>-<theme>-<size>.png, in screenshots/ (git-ignored; set SCREENSHOT_DIR to put them elsewhere), and
// replace any earlier pictures with the same names. This file is not part of `npm run verify`.

const dir = process.env.SCREENSHOT_DIR ?? 'screenshots'
const sizes = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 780 } }

for (const scheme of ['light', 'dark'] as const) {
  for (const [sizeName, size] of Object.entries(sizes)) {
    test(`${scheme} theme, ${sizeName}`, async ({ page }) => {
      test.setTimeout(90_000)
      mkdirSync(dir, { recursive: true })
      const shoot = (screen: string) => page.screenshot({ path: path.join(dir, `${screen}-${scheme}-${sizeName}.png`), fullPage: true })
      await page.emulateMedia({ colorScheme: scheme })
      await page.setViewportSize(sizes.desktop) // set the project up where the dancer panel is a sidebar
      await createProject(page)
      for (const name of ['Maya', 'Jordan', 'Priya']) await addDancer(page, name)
      await page.getByRole('button', { name: '+ New formation' }).click()
      await waitForSaved(page)
      await page.setViewportSize(size)

      await page.goto('/')
      await expect(page.getByRole('link', { name: /Untitled dance/ })).toBeVisible()
      await shoot('home')
      await page.getByRole('link', { name: /Untitled dance/ }).click()
      await expect(page.getByLabel('Formation name')).toBeVisible()
      await shoot('stage')
      if (sizeName === 'phone') {
        await page.getByRole('button', { name: 'Dancers' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await shoot('dancers-drawer')
        await page.keyboard.press('Escape')
      }
      await goToCast(page)
      await page.getByRole('button', { name: '+ Add part' }).click()
      await shoot('cast')
      await goToSong(page)
      await shoot('song-empty')
      await chooseFile(page, beatsWav({ bpm: 120, seconds: 20, firstBeatSec: 0.5 }, 'Groove.wav'))
      await page.getByRole('region', { name: 'Tempo' }).getByRole('status').waitFor({ timeout: 25_000 })
      await shoot('song-with-song')
      await goToResources(page)
      await shoot('resources-empty')
      await addLink(page, 'https://www.youtube.com/watch?v=abc123', 'Chorus tutorial')
      await addLink(page, 'drive.google.com/file/d/1AbC/view', 'Costume ideas')
      await page.getByLabel('Kind of link 1').selectOption('tutorial')
      await page.getByLabel('Section of link 1').selectOption({ index: 0 })
      await page.getByLabel('Start time of link 1').fill('1:23')
      await page.getByLabel('Start time of link 1').blur()
      await page.getByLabel('Kind of link 2').selectOption('document')
      await addNote(page, 'Everyone: smile from the very first count.')
      await page.getByLabel('About the new note').selectOption('count')
      await page.getByLabel('Set of the new note').fill('2')
      await page.getByLabel('Set of the new note').blur()
      await page.getByLabel('Count of the new note').fill('5')
      await page.getByLabel('Count of the new note').blur()
      await addNote(page, 'Arms up on 5-6.\nHold until the next set.')
      await shoot('resources')
    })
  }
}
