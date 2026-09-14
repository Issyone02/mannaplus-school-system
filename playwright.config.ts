import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  expect: { timeout: 20000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    navigationTimeout: 60000,
    actionTimeout: 20000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'public', testMatch: /public-pages\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'admin',
      testMatch: /admin-flows\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' },
    },
    {
      name: 'parent',
      testMatch: /parent-flows\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: '.auth/parent.json' },
    },
    {
      name: 'money-flow',
      testMatch: /money-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
})