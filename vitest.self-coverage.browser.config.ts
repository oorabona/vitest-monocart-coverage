import { defineConfig } from 'vitest/config'
import { withMonocartBrowserProvider } from './dist/index.js'

export default withMonocartBrowserProvider(
  defineConfig({
    optimizeDeps: {
      include: ['magicast', 'monocart-coverage-reports', 'picomatch'],
    },
    test: {
      include: ['tests/browser-simple.test.ts', 'tests/browser-runtime.test.ts'],
      // Note: browser-runtime.js is loaded dynamically via src/browser.js to ensure proper coverage instrumentation timing
      browser: {
        enabled: true,
        headless: true,
        instances: [
          {
            browser: 'chromium',
          },
        ],
        provider: 'playwright',
      },
      coverage: {
        enabled: true,
        // provider: 'custom',
        // customProviderModule: './dist/browser.js',
        reportsDirectory: './self-browser-coverage',
        include: ['src/**/*', 'example/**/*'],
        exclude: [
          '**/*.test.ts',
          '**/*.spec.ts',
          'tests/**/*',
          // Keep default excludes
          'node_modules/',
          'dist/',
          'coverage/',
          '*.config.*',
          '**/*.d.ts',
        ],
      },
    },
  }),
  {
    name: 'Vitest Monocart Browser Coverage',
    css: true, // Enable CSS coverage
    outputDir: './self-browser-coverage',
    reports: ['html', 'console-details', 'lcov'],
    logging: 'debug',
  },
)
