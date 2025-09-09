import { defineConfig } from 'vitest/config'

export default defineConfig({
  optimizeDeps: {
    include: ['magicast', 'monocart-coverage-reports', 'picomatch'],
  },
  test: {
    include: ['tests/browser-simple.test.ts'],
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
      // customProviderModule: './dist/browser-provider.js',
      reportsDirectory: './browser-coverage',
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
})
