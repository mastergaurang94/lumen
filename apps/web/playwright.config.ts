import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const shouldUseWebServer = !process.env.PLAYWRIGHT_NO_WEBSERVER;
const retries = Number(process.env.PLAYWRIGHT_RETRIES ?? 1);

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries,
  reporter: isCI ? [['html', { outputFolder: 'playwright-report' }], ['github']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Keep the e2e command self-contained: start Next when needed and
  // reuse an existing local server if one is already running.
  ...(shouldUseWebServer
    ? {
        webServer: {
          command: 'pnpm exec next dev --hostname 127.0.0.1',
          url: 'http://127.0.0.1:3000/setup',
          reuseExistingServer: true,
          cwd: __dirname,
          timeout: 240_000,
        },
      }
    : {}),
});
