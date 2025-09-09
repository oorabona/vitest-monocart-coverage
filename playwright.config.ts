import type { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  // Test directory for integration tests
  testDir: './tests/integration',

  // Test timeout
  timeout: 30 * 1000,

  // Test match pattern
  testMatch: '**/*.integration.test.ts',

  // Global test timeout
  expect: {
    timeout: 10000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'list',

  use: {
    // Browser launch options
    headless: true,

    // Enable Chrome DevTools Protocol for coverage testing
    launchOptions: {
      args: ['--enable-precise-memory-info', '--enable-dev-shm-usage'],
    },

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Capture video on retry
    video: 'retain-on-failure',

    // Enable tracing on retry
    trace: 'retain-on-failure',
  },

  // Run build before tests to ensure dist files are up-to-date
  globalSetup: './tests/integration/setup/global-setup.ts',
  globalTeardown: './tests/integration/setup/global-teardown.ts',

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chrome',
      },
    },
  ],

  // Output directory for test results
  outputDir: 'test-results/',
}

export default config
