import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const APP_PORT = 3210
const KREWHUB_PORT = 8421
const KREWHUB_PROJECT_PATH = join(process.cwd(), '..', 'krewhub')
const KREWHUB_BIN_PATH = join(KREWHUB_PROJECT_PATH, '.venv', 'bin', 'krewhub')
const KREWHUB_BASE_URL = `http://127.0.0.1:${KREWHUB_PORT}`
const KREWHUB_API_KEY = 'playwright-test-key'
const KREWHUB_DB_PATH = join(
  process.cwd(),
  'test-results',
  'krewhub-e2e.sqlite3'
)

mkdirSync(join(process.cwd(), 'test-results'), { recursive: true })
rmSync(KREWHUB_DB_PATH, { force: true })

process.env.PLAYWRIGHT_KREWHUB_BASE_URL = KREWHUB_BASE_URL
process.env.PLAYWRIGHT_KREWHUB_API_KEY = KREWHUB_API_KEY

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

function getNextServerCommand(port: number) {
  switch (detectPackageManager()) {
    case 'bun':
      return `bunx --bun next dev --webpack --hostname 127.0.0.1 --port ${port}`
    case 'pnpm':
      return `pnpm exec next dev --webpack --hostname 127.0.0.1 --port ${port}`
    case 'yarn':
      return `yarn exec next dev --webpack --hostname 127.0.0.1 --port ${port}`
    default:
      return `npx next dev --webpack --hostname 127.0.0.1 --port ${port}`
  }
}

function getNextServerEnv() {
  return {
    ...process.env,
    KREWHUB_BASE_URL: KREWHUB_BASE_URL,
    KREWHUB_API_KEY: KREWHUB_API_KEY,
  }
}

function getKrewHubServerCommand() {
  if (existsSync(KREWHUB_BIN_PATH)) {
    return JSON.stringify(KREWHUB_BIN_PATH)
  }

  return `uv run --project ${JSON.stringify(KREWHUB_PROJECT_PATH)} krewhub`
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-demo',
      testIgnore: /krewhub\.spec\.ts$|multi-agent\.spec\.ts$/,
      use: {
        baseURL: `http://127.0.0.1:${APP_PORT}`,
        browserName: 'chromium',
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'chromium-krewhub',
      testMatch: /krewhub\.spec\.ts$/,
      use: {
        baseURL: `http://127.0.0.1:${APP_PORT}`,
        browserName: 'chromium',
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'chromium-multiagent',
      testMatch: /multi-agent\.spec\.ts$/,
      use: {
        // Runs against the live docker compose stack (port 3000)
        baseURL: 'http://127.0.0.1:3000',
        browserName: 'chromium',
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
  webServer: [
    {
      // Real KrewHub instance used by the proxy-backed browser test.
      command: getKrewHubServerCommand(),
      cwd: KREWHUB_PROJECT_PATH,
      env: {
        ...process.env,
        KREWHUB_HOST: '127.0.0.1',
        KREWHUB_PORT: String(KREWHUB_PORT),
        KREWHUB_DATABASE_PATH: KREWHUB_DB_PATH,
        KREWHUB_API_KEY: KREWHUB_API_KEY,
      },
      url: `${KREWHUB_BASE_URL}/openapi.json`,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 120 * 1000,
    },
    {
      // Single Next server; demo-mode tests opt into local data via a cookie override.
      command: getNextServerCommand(APP_PORT),
      env: getNextServerEnv(),
      url: `http://127.0.0.1:${APP_PORT}`,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 120 * 1000,
    },
  ],
})
