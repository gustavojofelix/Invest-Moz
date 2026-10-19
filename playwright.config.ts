import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PORT'] ?? 4310);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-pt',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 780 },
        locale: 'pt-PT',
      },
      metadata: { lang: 'pt' },
    },
    {
      name: 'desktop-en',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        locale: 'en-GB',
      },
      metadata: { lang: 'en' },
    },
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env['CI'],
  },
});
