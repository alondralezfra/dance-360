import { expect, test } from '@playwright/test'
import { addDancer, addNote, createProject, goToResources, goToStage } from './helpers'

// Notes beside the stage: read-only, following the playhead (a note at a count stays "now" until the next one).

test.beforeEach(async ({ page }) => {
  await createProject(page)
  await addDancer(page, 'Maya')
  await goToResources(page)
  await page.getByLabel('About the new note').selectOption('count')
  await addNote(page, 'Start low') // Set 1 · Count 1
  await page.getByLabel('Set of the new note').fill('2')
  await addNote(page, 'Hands up') // Set 2 · Count 1
  await goToStage(page)
})

const current = (page: import('@playwright/test').Page) => page.locator('li[aria-current="true"]')

test('the notes panel is hidden until asked for, then follows the playhead, and is remembered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const panel = page.locator('#stage-notes-panel')
  await expect(panel).toBeHidden()

  await page.getByRole('button', { name: 'Show notes (2)' }).click()
  await expect(panel.getByText('Start low')).toBeVisible()
  await expect(panel.getByText('Hands up')).toBeVisible()
  await expect(current(page)).toHaveText(/Start low/)

  await page.getByRole('button', { name: '+ New formation' }).click() // one set later: count 8
  await expect(current(page)).toHaveText(/Hands up/)

  await page.reload()
  await expect(page.locator('#stage-notes-panel').getByText('Start low')).toBeVisible()
  await page.getByRole('button', { name: 'Hide notes' }).click()
  await expect(page.locator('#stage-notes-panel')).toBeHidden()
})

test('the edit link goes to the Resources tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole('button', { name: 'Show notes (2)' }).click()
  await page.getByRole('link', { name: 'Edit notes on the Resources tab' }).click()
  await expect(page).toHaveURL(/\/resources$/)
})

test('on a phone the notes open as a drawer, and the page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.getByRole('button', { name: 'Notes (2)' }).click()
  const drawer = page.getByRole('dialog', { name: 'Notes' })
  await expect(drawer.getByText('Start low')).toBeVisible()
  await expect(drawer.getByText('Hands up')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
})
