import { expect, test } from '@playwright/test'
import { createProject, legacyProject, resetStorage, savedProject } from './helpers'

test.describe('projects home', () => {
  test('starts empty and creates a project that opens in the stage editor', async ({ page }) => {
    await resetStorage(page)
    await expect(page.getByText('No projects yet')).toBeVisible()

    await page.getByRole('button', { name: '+ New project' }).click()
    await expect(page).toHaveURL(/\/projects\/.+\/stage/)
    await expect(page.getByLabel('Project name')).toHaveValue('Untitled dance')
  })

  test('lists projects and reopens one from its card', async ({ page }) => {
    await createProject(page)
    await page.getByLabel('Project name').fill('Spring Showcase')
    await expect(page.getByRole('status').getByText('Saved')).toBeVisible()

    await page.getByRole('link', { name: 'Dance 360' }).click()
    await expect(page.getByRole('link', { name: /Spring Showcase/ })).toBeVisible()
    await page.getByRole('link', { name: /Spring Showcase/ }).click()
    await expect(page.getByLabel('Project name')).toHaveValue('Spring Showcase')
  })

  test('deletes a project after confirming', async ({ page }) => {
    await createProject(page)
    await page.getByRole('link', { name: 'Dance 360' }).click()

    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /^Delete / }).click()
    await expect(page.getByText('No projects yet')).toBeVisible()
    expect(await savedProject(page)).toBeNull()
  })

  test('keeps the project if deletion is cancelled', async ({ page }) => {
    await createProject(page)
    await page.getByRole('link', { name: 'Dance 360' }).click()

    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: /^Delete / }).click()
    await expect(page.getByRole('link', { name: /Untitled dance/ })).toBeVisible()
  })

  test("imports the old single-project save so nobody's work is lost", async ({ page }) => {
    await resetStorage(page)
    await page.evaluate((legacy) => localStorage.setItem('dance360-project', JSON.stringify(legacy)), legacyProject)
    await page.reload()

    await expect(page.getByRole('link', { name: /Legacy dance/ })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('dance360-project'))).toBeNull()

    await page.getByRole('link', { name: /Legacy dance/ }).click()
    await expect(page.getByLabel('Dancer name')).toHaveCount(2)
    // the old second formation lands one set after the first
    await page.getByRole('button', { name: 'Next formation' }).click()
    await expect(page.getByLabel('Set', { exact: true })).toHaveValue('2')
    await expect(page.getByLabel('Count', { exact: true })).toHaveValue('1')
  })

  test('shows a friendly error for a project that does not exist', async ({ page }) => {
    await resetStorage(page)
    await page.goto('/projects/nope/stage')
    await expect(page.getByText('could not be found')).toBeVisible()
    await page.getByRole('link', { name: 'Back to your projects' }).click()
    await expect(page).toHaveURL('/')
  })

  test('shows a not-found page for unknown URLs', async ({ page }) => {
    await page.goto('/whatever')
    await expect(page.getByText('Page not found')).toBeVisible()
  })

  test('opening /projects/:id redirects to the stage', async ({ page }) => {
    await createProject(page)
    const url = page.url().replace(/\/stage$/, '')
    await page.goto(url)
    await expect(page).toHaveURL(/\/stage$/)
  })
})
