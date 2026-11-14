import { expect, test } from '@playwright/test'
import { stagePixel } from './helpers'

// The stage canvas is only drawn once its container has been measured, so on a slow machine (a CI runner) it is
// briefly missing or hidden after a screen opens. These helpers must wait for it instead of reading a position
// that is not there yet (which failed CI once with "Cannot read properties of null (reading 'width')").

test.describe('stagePixel', () => {
  test('waits for a canvas that is not shown yet', async ({ page }) => {
    await page.setContent(`
      <canvas id="late" width="800" height="480" style="display:none;width:800px;height:480px"></canvas>
      <script>setTimeout(() => (document.getElementById('late').style.display = 'block'), 400)</script>`)
    const point = await stagePixel(page, { x: 20, y: 12 })
    expect(point.scale).toBeGreaterThan(0)
    expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
  })

  test('says clearly when there is no canvas at all, instead of a TypeError', async ({ page }) => {
    await page.setContent('<p>no stage here</p>')
    await expect(stagePixel(page, { x: 0, y: 0 }, undefined, 500)).rejects.toThrow(/stage canvas was not drawn within 500 ms/i)
  })
})
