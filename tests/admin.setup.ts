import { test as setup } from '@playwright/test'

setup('sign in as admin', async ({ page }) => {
  setup.setTimeout(180000) // room for one manual email code, if ever needed again
  const email = process.env.ADMIN_TEST_EMAIL
  const pass = process.env.ADMIN_TEST_PASSWORD
  if (!email || !pass) throw new Error('Missing ADMIN_TEST_EMAIL or ADMIN_TEST_PASSWORD in .env')

  // 1️⃣ Sign in
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('input[name="identifier"]').fill(email)
  await page.locator('form').getByRole('button', { name: 'Continue', exact: true }).first().click()

  const password = page.locator('input[name="password"]')
  await password.waitFor({ state: 'visible', timeout: 30000 })
  await password.fill(pass)
  await page.locator('form').getByRole('button', { name: 'Continue', exact: true }).first().click()

  // ⌨️ (If the email-code page ever appears again, type the code now)
  await page.locator('nav').getByRole('link', { name: 'Dashboard' }).waitFor({ state: 'visible', timeout: 150000 })

  // 2️⃣ ✅ Enter the admin area EXACTLY like a human: dashboard → Admin Portal card
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page
    .getByRole('link', { name: /Admin Portal/i })
    .or(page.getByRole('button', { name: /Admin Portal/i }))
    .first()
    .click()
  await page.waitForURL(/\/admin/, { timeout: 60000, waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000) // let role cookies/state settle

  // 3️⃣ Save the fully-activated admin session
  await page.context().storageState({ path: '.auth/admin.json' })
})