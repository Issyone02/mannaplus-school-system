import { test, expect } from '@playwright/test'

const go = (page: any, url: string) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

test.describe('Public website smoke tests', () => {
  test('home page loads with the school name', async ({ page }) => {
    await go(page, '/')
    await expect(page).toHaveTitle(/Mannaplus/)
    await expect(page.getByRole('heading', { name: /Mannaplus Group of Schools/i }).first()).toBeVisible()
  })

  test('navbar navigates to News & Events', async ({ page }) => {
    await go(page, '/')
    await page.locator('nav').getByRole('link', { name: 'News & Events' }).first().click()
    await expect(page).toHaveURL(/\/news/)
    await expect(page.getByRole('heading', { name: /Highlights from Mannaplus/i })).toBeVisible()
  })

  test('about and contact pages load', async ({ page }) => {
    await go(page, '/about')
    await expect(page).toHaveURL(/\/about/)
    await go(page, '/contact')
    await expect(page).toHaveURL(/\/contact/)
  })

  test('a published article opens (when articles exist)', async ({ page }) => {
    await go(page, '/news')
    const card = page.locator('a[href^="/news/"]').first()
    if (await card.count()) {
      await card.click()
      await expect(page).toHaveURL(/\/news\//)
      await expect(page.locator('article')).toBeVisible({ timeout: 30000 })
    }
  })
})