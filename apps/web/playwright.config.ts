import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['html', { outputFolder: 'playwright-report' }], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only configure webServer in CI or if explicitly requested.
  // For local development, assume `pnpm dev` is already running.
  ...(isCI || process.env.PLAYWRIGHT_START_SERVER
    ? {
        webServer: {
          command: 'pnpm exec next dev --hostname 127.0.0.1',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: false,
          cwd: __dirname,
          timeout: 120_000,
        },
      }
    : {}),
});
