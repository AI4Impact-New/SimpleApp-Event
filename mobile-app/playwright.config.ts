import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: process.env.QA_STUDENT_URL || 'http://127.0.0.1:8765', viewport: { width: 390, height: 844 }, screenshot: 'only-on-failure' },
  webServer: process.env.QA_STUDENT_URL ? undefined : {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: !process.env.CI,
  },
});
