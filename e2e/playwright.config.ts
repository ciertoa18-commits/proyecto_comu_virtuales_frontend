import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: process.env['E2E_URL'] ?? 'http://localhost:4201',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { outputFolder: 'reporte', open: 'never' }]],
});
