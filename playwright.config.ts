// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// E2E (§18.7): Chromium, WebKit, Firefox × Pixel / iPhone / desktop. Local runs use the pre-installed Chromium only
// (E2E_BROWSERS=all in CI). The API runs with the scripted mock LLM; data comes from public/data.
import { defineConfig, devices } from '@playwright/test';

const all = process.env.E2E_BROWSERS === 'all' || !!process.env.CI;
const chromium = process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {};
const projects = [
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], ...chromium } },
  { name: 'chromium-pixel', use: { ...devices['Pixel 7'], ...chromium } },
  ...(all
    ? [
        { name: 'webkit-iphone', use: { ...devices['iPhone 14'] } },
        { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
        { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
      ]
    : []),
];

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'a11y/**/*.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects,
  webServer: [
    {
      command: 'FINANDEX_MOCK_LLM=1 LOG_LEVEL=error npx tsx scripts/dev/api-server.ts',
      url: 'http://localhost:8787/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
