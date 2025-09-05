import { defineConfig } from 'vitest/config'
import { withMonocartProvider } from './src/provider-config.js'

export default withMonocartProvider(
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts'],
      testTimeout: 10000,
      hookTimeout: 10000,
      teardownTimeout: 5000,
      isolate: true,
      pool: 'forks',
      coverage: {
        enabled: true,
        include: ['src/**/*'],
        exclude: [
          'node_modules/',
          'scripts/',
          'dist/',
          'tests/',
          '*.config.*',
          '**/*.d.ts',
          '**/*.test.*',
          '**/*.spec.*',
        ],
        clean: true,
        thresholds: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    esbuild: {
      target: 'node20',
    },
  }),
  {
    name: 'Vitest Monocart Self Coverage',
    outputDir: './self-coverage',
    reports: ['html', 'console-details', 'lcov'],
    logging: 'info',
  },
)
