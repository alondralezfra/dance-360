import { expect, test } from '@playwright/test'

// Runs against the live site (see playwright.smoke.config.ts). Every run uses a brand-new browser
// context, so it creates its project in an empty browser and nothing of anyone's is touched.
test('the deployed site loads, makes a project that survives a reload, and logs no errors', async ({ page }) => {
  // A blocked script or style (a broken Content-Security-Policy), a failed request and a crash all land here.
  const problems: string[] = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`crash: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`))

  await page.goto('/')
  await expect(page).toHaveTitle('Formism')
  await page.getByRole('button', { name: '+ New project' }).click()
  await page.waitForURL(/\/projects\/.+\/stage/)

  const name = page.getByLabel('Project name')
  await expect(name).toBeVisible()
  const projectName = await name.inputValue()
  const address = page.url()
  await expect(page.getByRole('status').getByText('Saved')).toBeVisible()

  // Reloading a deep address needs the host's fall-back to index.html, and the project must come back from storage.
  await page.reload()
  await expect(page).toHaveURL(address)
  await expect(page.getByLabel('Project name')).toHaveValue(projectName)

  expect(problems).toEqual([])
})
