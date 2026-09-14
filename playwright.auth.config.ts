import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  testDir: './tests',
  timeout: 300000, // room for you to type the email code
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    navigationTimeout: 60000,
    actionTimeout: 20000,
  },
  projects: [
    { name: 'admin-setup', testMatch: /admin\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'parent-setup', testMatch: /parent\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
})