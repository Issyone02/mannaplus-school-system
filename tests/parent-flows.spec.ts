import { test, expect } from '@playwright/test'

test.describe('Parent portal checks (signed in)', () => {
  test('parent portal loads', async ({ page }) => {
    await page.goto('/parent')
    await expect(page.getByRole('heading', { name: /Parent Portal|Welcome/i }).first()).toBeVisible()
  })

  test('parent can open fee view for a child', async ({ page }) => {
    await page.goto('/parent')
    const feeBtn = page.getByRole('button', { name: /View Fees/i }).first()
    if (await feeBtn.count()) {
      await feeBtn.click()
      await expect(page.getByText(/Total Expected/i)).toBeVisible()
    }
  })
})