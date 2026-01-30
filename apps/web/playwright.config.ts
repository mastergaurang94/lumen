import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    // Use Next dev server for smoke flow.
    command: 'node ./node_modules/next/dist/bin/next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: __dirname,
  },
});
