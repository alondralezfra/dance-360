import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { addDancer, createProject, resetStorage, savedProject, waitForSaved } from './helpers'

// Backing a project up to a file and bringing it back, and the screen shown when something crashes.

const toHome = (page: Page) => page.goto('/')

/** Clicks Export for a project on the home screen and returns the text of the file the browser downloaded. */
async function exportFromHome(page: Page, name: string) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: `Export ${name}` }).click()])
  return { fileName: download.suggestedFilename(), text: readFileSync((await download.path())!, 'utf8') }
}

const importFile = (page: Page, name: string, text: string) =>
  page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) })

test.describe('exporting and importing a project', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('a project can be exported and imported again with everything in it', async ({ page }) => {
    await createProject(page)
    await page.getByLabel('Project name').fill('Spring Show')
    await addDancer(page, 'Maya')
    await addDancer(page, 'Jo')
    await page.getByRole('button', { name: '+ New formation' }).click()
    await waitForSaved(page)
    const original = await savedProject(page)

    await toHome(page)
    const { fileName, text } = await exportFromHome(page, 'Spring Show')
    expect(fileName).toMatch(/^Spring Show \d{4}-\d{2}-\d{2}\.dance360\.json$/)
    expect(JSON.parse(text).project).toEqual(original)

    await importFile(page, fileName, text)
    await expect(page).toHaveURL(/\/projects\/.+\/stage/)
    await expect(page.getByLabel('Project name')).toHaveValue('Spring Show (imported)')
    await expect(page.getByText('Dancers (2)')).toBeVisible()
    await expect(page.getByLabel('Formation name')).toBeVisible()
    await waitForSaved(page)

    // it is a second project: the original is still there, untouched
    await toHome(page)
    await expect(page.getByRole('link', { name: /Spring Show \(imported\)/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Spring Show\s+Edited/ })).toBeVisible()
    const copy = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('dance360:project:'))
      return keys.map((k) => JSON.parse(localStorage.getItem(k)!).project)
    })
    expect(copy).toHaveLength(2)
    expect(copy.map((p) => p.dancers.length)).toEqual([2, 2])
    expect(copy.map((p) => p.formations.length)).toEqual([2, 2])
  })

  test('works as a backup: export, delete, import brings it back', async ({ page }) => {
    await createProject(page)
    await page.getByLabel('Project name').fill('Winter Gala')
    await addDancer(page, 'Maya')
    await waitForSaved(page)

    await toHome(page)
    const { fileName, text } = await exportFromHome(page, 'Winter Gala')
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Delete Winter Gala' }).click()
    await expect(page.getByText(/No projects yet/)).toBeVisible()

    await importFile(page, fileName, text)
    await expect(page.getByLabel('Project name')).toHaveValue('Winter Gala (imported)')
    await expect(page.getByText('Dancers (1)')).toBeVisible()
  })

  test('the song is not in the file; the imported project asks for it again', async ({ page }) => {
    await resetStorage(page)
    const withSong = {
      name: 'Has a song',
      stage: { width: 40, depth: 24 },
      tempo: { bpm: 128, startOffsetSec: 0.5, changes: [] },
      song: { name: 'Groove.mp3', durationSec: 30, size: 1234, mime: 'audio/mpeg', hash: 'abc123' },
      dancers: [],
      formations: [{ id: 'f1', name: 'Formation 1', count: 0, transitionCounts: 4, positions: {} }],
      parts: [{ id: 'p1', name: 'Everyone', color: 'blue', sectionIds: null }],
      sections: [{ id: 's1', name: 'Section 1', startCount: 0 }],
      assignments: {},
    }
    const text = JSON.stringify({ kind: 'dance-360-project', fileVersion: 1, dataVersion: 4, exportedAt: '2026-11-10T00:00:00Z', project: withSong })
    await importFile(page, 'x.json', text)
    await expect(page).toHaveURL(/\/projects\/.+\/stage/)
    await page.getByRole('link', { name: 'Song', exact: true }).click()
    await expect(page.getByText('Groove.mp3', { exact: true })).toBeVisible() // (the notice below also names the file)
    await expect(page.getByText(/not on this device/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose the file again' })).toBeVisible()
    expect((await savedProject(page)).tempo.bpm).toBe(128)
  })

  test('a file saved by an older version of the app is upgraded on the way in', async ({ page }) => {
    await resetStorage(page)
    const v1 = JSON.parse(readFileSync('src/persistence/fixtures/v1.json', 'utf8'))
    const text = JSON.stringify({ kind: 'dance-360-project', fileVersion: 1, dataVersion: 1, project: v1 })
    await importFile(page, 'old.json', text)
    await expect(page).toHaveURL(/\/projects\/.+\/stage/)
    const project = await savedProject(page)
    expect(project.song).toBeNull()
    expect(project.tempo.changes).toEqual([])
    expect(project.parts.length).toBeGreaterThan(0)
    expect(project.parts[0].sectionIds).toBeNull()
    await expect(page.getByLabel('Formation name')).toBeVisible()
  })

  test('says what is wrong with a file that cannot be used, and adds nothing', async ({ page }) => {
    await resetStorage(page)
    await importFile(page, 'notes.json', 'this is not json at all')
    await expect(page.getByRole('alert')).toContainText('This is not a Dance 360 project file.')
    await expect(page).toHaveURL('/')

    await importFile(page, 'future.json', JSON.stringify({ kind: 'dance-360-project', fileVersion: 1, dataVersion: 999, project: {} }))
    await expect(page.getByRole('alert')).toContainText('newer version of Dance 360')

    await importFile(page, 'damaged.json', JSON.stringify({ kind: 'dance-360-project', fileVersion: 1, dataVersion: 4, project: { name: 'x' } }))
    await expect(page.getByRole('alert')).toContainText('damaged')

    await expect(page.getByText(/No projects yet/)).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByRole('alert')).toBeHidden()
  })
})

test.describe('when something crashes', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  /** Damages the saved project so the screen that shows it cannot be drawn, then opens it. */
  async function crashTheStage(page: Page) {
    await page.setViewportSize({ width: 1280, height: 800 }) // (the dancer panel is a sidebar here, so a dancer can be added)
    await createProject(page)
    await page.getByLabel('Project name').fill('Fragile Show')
    await addDancer(page, 'Maya')
    await waitForSaved(page)
    const url = page.url()
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('dance360:project:'))!
      const record = JSON.parse(localStorage.getItem(key)!)
      record.project.dancers = 'not a list' // the dancer panel maps over this, and cannot
      localStorage.setItem(key, JSON.stringify(record))
    })
    await page.goto(url)
  }

  test('shows a calm error screen instead of a blank page', async ({ page }) => {
    await crashTheStage(page)
    await expect(page.getByRole('alert')).toContainText('Something went wrong')
    await expect(page.getByRole('alert')).toContainText('saved automatically')
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to your projects' })).toBeVisible()
  })

  test('lets the person download the project that crashed, and go back', async ({ page }) => {
    await crashTheStage(page)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download this project' }).click()])
    expect(download.suggestedFilename()).toMatch(/^Fragile Show .*\.dance360\.json$/)
    const file = JSON.parse(readFileSync((await download.path())!, 'utf8'))
    expect(file.kind).toBe('dance-360-project')
    expect(file.project.name).toBe('Fragile Show')

    await page.getByRole('link', { name: 'Back to your projects' }).click()
    await expect(page.getByRole('link', { name: /Fragile Show/ })).toBeVisible()
  })

  test('works on a phone, in the dark theme, without sideways scrolling', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await crashTheStage(page)
    await page.setViewportSize({ width: 390, height: 780 })
    for (const name of ['Reload', 'Download this project']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(40)
      expect(box.x + box.width).toBeLessThanOrEqual(390)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
})

test.describe('the projects home on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('the import, new, export and delete buttons fit and are easy to touch', async ({ page }) => {
    await createProject(page)
    await page.getByLabel('Project name').fill('A rather long project name for a small screen')
    await waitForSaved(page)
    await toHome(page)
    for (const name of ['Import project', '+ New project', 'Export A rather long project name for a small screen', 'Delete A rather long project name for a small screen']) {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      expect(box.height, name).toBeGreaterThanOrEqual(40)
      expect(box.x + box.width, name).toBeLessThanOrEqual(390)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
})
