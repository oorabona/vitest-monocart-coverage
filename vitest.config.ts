import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reportsDirectory: './coverage',
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [
        'node_modules/',
        'scripts/',
        'dist/',
        'tests/',
        '*.config.*',
        '**/*.d.ts',
        '**/types*',
        'examples/',
        'docs/',
        'src/**/*.test.*',
        'src/**/*.spec.*',
      ],
      clean: true,
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      '**/*.d.ts',
      'tests/integration/**/*.test.ts',
      'tests/browser-simple.test.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'forks',
  },
  esbuild: {
    target: 'node20',
  },
})
