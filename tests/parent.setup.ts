import { test as setup } from '@playwright/test'

setup('sign in as parent', async ({ page }) => {
  setup.setTimeout(180000)
  const email = process.env.PARENT_TEST_EMAIL
  const pass = process.env.PARENT_TEST_PASSWORD
  if (!email || !pass) throw new Error('Missing PARENT_TEST_EMAIL or PARENT_TEST_PASSWORD in .env')

  await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('input[name="identifier"]').fill(email)
  await page.locator('form').getByRole('button', { name: 'Continue', exact: true }).first().click()

  const password = page.locator('input[name="password"]')
  await password.waitFor({ state: 'visible', timeout: 30000 })
  await password.fill(pass)
  await page.locator('form').getByRole('button', { name: 'Continue', exact: true }).first().click()

  // ⌨️ Type the email code when prompted (you have 3 minutes)
  await page.locator('nav').getByRole('link', { name: 'Dashboard' }).waitFor({ state: 'visible', timeout: 150000 })

  await page.context().storageState({ path: '.auth/parent.json' })
})