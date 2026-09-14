import { test, expect } from '@playwright/test'

const TEST_AMOUNT = 600 + (Date.now() % 99)

let childCode = ''
let recordedForChild = false

// ✅ Fail FAST with instructions if the cached session died (no more mystery timeouts)
async function assertSessionAlive(page: any, role: string) {
  if (page.url().includes('/sign-in')) {
    throw new Error(
      `❌ ${role} session EXPIRED. Run once:\n   npm run auth:refresh\n(type the email code in the opened browser), then re-run the suite.`
    )
  }
}

// ✅ NoticePopup modals stack (one per child). Close them like a human would:
// click whatever button lives inside the overlay, repeat until none remain.
async function dismissNoticePopups(page: any) {
  for (let round = 0; round < 8; round++) {
    const overlay = page.locator('div.fixed.inset-0:visible').first()
    if ((await overlay.count()) === 0) return
    const buttons = overlay.locator('button')
    const n = await buttons.count()
    console.log(`🪟 Popup #${round + 1} found with ${n} button(s)`)
    if (n > 0) {
      await buttons.last().click({ timeout: 3000 })
        .catch(() => buttons.first().click({ timeout: 3000 }).catch(() => {}))
    } else {
      await page.keyboard.press('Escape').catch(() => {})
    }
    await page.waitForTimeout(700)
    // Last resort if an overlay refuses to close after 3 tries: remove it from the DOM
    if (round >= 2 && (await overlay.count()) > 0) {
      console.log('🪟 Force-removing stubborn overlay')
      await overlay.evaluate((el: Element) => el.remove()).catch(() => {})
      await page.waitForTimeout(300)
    }
  }
}

async function openChildFeeView(page: any) {
  await dismissNoticePopups(page)

  const feesBtn = page.getByTestId('view-fees').first()
    .or(page.getByRole('button', { name: /view fees/i }).first())

  // If a popup sneaks in mid-click, dismiss and retry once
  await feesBtn.click({ timeout: 15000 }).catch(async () => {
    console.log('🪟 Popup reappeared during click — dismissing again')
    await dismissNoticePopups(page)
    await feesBtn.click({ timeout: 45000 })
  })

  await page.getByText(/Fee Status\s*-/i).first().waitFor({ state: 'visible', timeout: 30000 })
}

test.describe.serial('End-to-end money flow', () => {

  test('1. Parent child code captured', async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/parent.json' })
    const page = await context.newPage()
    page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('NAV →', f.url()) })
    page.on('console', m => console.log('BROWSER:', m.text()))   // ← ALL console, not just errors
    page.on('pageerror', e => console.log('PAGE ERROR:', e.message))
    page.on('requestfailed', r => console.log('REQ FAILED:', r.url(), r.failure()?.errorText))
    await page.goto('/parent', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)
    await assertSessionAlive(page, 'Parent')

    await openChildFeeView(page)
    const body = await page.locator('body').innerText()
    const m = body.match(/MPLS\/STU\/\d+/i)
    childCode = m ? m[0].toUpperCase() : ''
    console.log('👶 Child code:', childCode)
    expect(childCode).not.toBe('')

    await context.close()
  })

  test('2. Admin records payment for THAT child', async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/admin.json' })
    const page = await context.newPage()
    await page.goto('/admin/fees', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)
    await assertSessionAlive(page, 'Admin')

    await expect(page.getByRole('heading', { name: /Fee Management/i })).toBeVisible({ timeout: 30000 })
    await page.getByRole('button', { name: /record payment/i }).first().click()
    await page.waitForTimeout(1500)
    const modal = page.locator('div.fixed:visible').last()

    const studentSelect = modal.locator('select').first()
    const options = await studentSelect.locator('option').allTextContents()
    const idx = options.findIndex(o => o.toUpperCase().includes(childCode))
    expect(idx).toBeGreaterThan(0)
    await studentSelect.selectOption({ index: idx })
    recordedForChild = true
    console.log(`🎯 Recording for: ${options[idx]}`)

    await modal.locator('input[type="number"]').first().fill(String(TEST_AMOUNT))

    const selects = modal.locator('select')
    for (let i = 1; i < (await selects.count()); i++) {
      await selects.nth(i).selectOption({ index: 1 }).catch(() => {})
    }
    const texts = modal.locator('input:visible:not([type="number"]):not([type="checkbox"]):not([type="date"])')
    for (let i = 0; i < (await texts.count()); i++) {
      if (!(await texts.nth(i).inputValue())) await texts.nth(i).fill('E2E test payment')
    }
    const dates = modal.locator('input[type="date"]:visible')
    for (let i = 0; i < (await dates.count()); i++) {
      if (!(await dates.nth(i).inputValue())) await dates.nth(i).fill(new Date().toISOString().slice(0, 10))
    }

    await modal.getByRole('button', { name: /^save$|save payment|submit/i }).last().click()

    await page.getByRole('button', { name: /^payments$/i }).or(page.getByRole('tab', { name: /payments/i }))
      .first().click({ timeout: 5000 }).catch(() => {})

    await expect(page.getByText(String(TEST_AMOUNT)).first()).toBeVisible({ timeout: 20000 })
    console.log(`✅ Admin recorded ₦${TEST_AMOUNT}`)
    await context.close()
  })

  test('3. Parent sees it in Payment History', async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/parent.json' })
    const page = await context.newPage()
    await page.goto('/parent', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)
    await assertSessionAlive(page, 'Parent')

    await openChildFeeView(page)
    await page.getByTestId('payment-history').waitFor({ state: 'visible', timeout: 30000 })
    await expect(page.getByText(String(TEST_AMOUNT)).first()).toBeVisible({ timeout: 20000 })
    console.log(`✅✅ Parent sees ₦${TEST_AMOUNT} in Payment History — MONEY FLOW PROVEN END-TO-END`)

    await context.close()
  })
})