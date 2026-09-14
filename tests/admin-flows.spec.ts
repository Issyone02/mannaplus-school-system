import { test, expect } from '@playwright/test'

test.describe('Admin portal checks', () => {
  test('students page loads', async ({ page }) => {
    await page.goto('/admin/students', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('heading', { name: /Students Management/i })).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/Showing/).first()).toBeVisible({ timeout: 10000 })
  })

  test('fee management loads', async ({ page }) => {
    await page.goto('/admin/fees', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('heading', { name: /Fee Management/i })).toBeVisible({ timeout: 30000 })
  })

  test('news manager loads', async ({ page }) => {
    await page.goto('/admin/news', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.getByRole('heading', { name: /News & Events Manager|News Management/i })).toBeVisible({ timeout: 30000 })
  })
})