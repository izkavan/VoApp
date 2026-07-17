import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['monocart-reporter', {
      name: "E2E V8 Coverage Report",
      outputFile: './test-results/coverage/index.html',
      coverage: {
        entryFilter: (entry: any) => true,
        sourceFilter: (sourcePath: string) => sourcePath.search(/src\//) !== -1,
        sourcePath: (fileSource: string) => {
          const match = fileSource.match(/src\/.*/);
          return match ? match[0] : fileSource;
        },
        all: './src'
      }
    }]
  ],
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
  ],
  outputDir: 'test-results/',
  webServer: {
    command: 'npm run build && npm run preview',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
