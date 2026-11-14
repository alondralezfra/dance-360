import { expect, test } from '@playwright/test'
import { addDancer, createProject, goToCast, goToOverview, goToStage } from './helpers'

// The Overview tab: a summary and the problems list, worked out from the project each time.

test.beforeEach(async ({ page }) => {
  await createProject(page)
  await addDancer(page, 'Maya')
  await addDancer(page, 'Jordan')
})

test('starts with no problems and shows the project summary', async ({ page }) => {
  await goToOverview(page)
  await expect(page.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText(/No problems/)).toBeVisible()
  await expect(page.getByText('Dancers', { exact: true }).locator('xpath=following-sibling::dd')).toHaveText('2')
})

test('lists dancers with no part, goes to Cast & Parts, and clears once they are assigned', async ({ page }) => {
  await goToCast(page)
  await page.getByRole('button', { name: '+ Add part' }).click() // two parts, so dancers have to be put in one
  await goToOverview(page)
  const problem = page.getByRole('link', { name: /2 dancers have no part in/ })
  await expect(problem).toContainText('Maya, Jordan')

  await problem.click()
  await expect(page).toHaveURL(/\/cast$/)
  await page.getByLabel('Maya, Section 1').selectOption({ label: 'Everyone' })
  await page.getByLabel('Jordan, Section 1').selectOption({ label: 'Everyone' })

  await goToOverview(page)
  await expect(page.getByText(/No problems/)).toBeVisible()
})

test('opens on its own address, survives a reload, and Stage is still where a project opens', async ({ page }) => {
  await goToOverview(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Problems' })).toBeVisible()
  await goToStage(page)
  const stageUrl = page.url()
  await page.goto(stageUrl.replace(/\/stage$/, ''))
  await expect(page).toHaveURL(/\/stage$/)
})

test('on a phone the tab is reachable and the page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await goToCast(page)
  await page.getByRole('button', { name: '+ Add part' }).click()
  await goToOverview(page)
  await expect(page.getByRole('link', { name: /no part in/ })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})
