import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const PORT = 3210
const WEB_SERVER_COMMAND = getWebServerCommand()

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? ''

  if (userAgent.startsWith('bun/')) {
    return 'bun'
  }

  if (userAgent.startsWith('pnpm/')) {
    return 'pnpm'
  }

  if (userAgent.startsWith('yarn/')) {
    return 'yarn'
  }

  if (userAgent.startsWith('npm/')) {
    return 'npm'
  }

  if (existsSync(join(process.cwd(), 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }

  if (
    existsSync(join(process.cwd(), 'bun.lock')) ||
    existsSync(join(process.cwd(), 'bun.lockb'))
  ) {
    return 'bun'
  }

  if (existsSync(join(process.cwd(), 'yarn.lock'))) {
    return 'yarn'
  }

  return 'npm'
}

function getWebServerCommand() {
  switch (detectPackageManager()) {
    case 'bun':
      return `bunx --bun next dev --webpack --hostname 127.0.0.1 --port ${PORT}`
    case 'pnpm':
      return `pnpm exec next dev --webpack --hostname 127.0.0.1 --port ${PORT}`
    case 'yarn':
      return `yarn exec next dev --webpack --hostname 127.0.0.1 --port ${PORT}`
    default:
      return `npx next dev --webpack --hostname 127.0.0.1 --port ${PORT}`
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
  webServer: {
    // Keep Playwright aligned with whichever package manager launched the tests.
    command: WEB_SERVER_COMMAND,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
})
