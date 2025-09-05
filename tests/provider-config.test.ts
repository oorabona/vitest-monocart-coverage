import { describe, expect, it } from 'vitest'
import type { ViteUserConfig } from 'vitest/config'
import { createMonocartConfig, withMonocartProvider } from '../src/provider-config.js'
import type { MonocartCoverageOptions } from '../src/types.js'

describe('withMonocartProvider', () => {
  describe('coverage-only mode', () => {
    it('should return coverage config when called with no arguments', () => {
      const result = withMonocartProvider()

      expect(result.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(result.customProviderModule).toBe('@oorabona/vitest-monocart-coverage')
      expect(result.enabled).toBe(true)
      expect(result.clean).toBe(true)
      expect(result.include).toEqual(['src/**/*'])
      expect(result.exclude).toEqual([
        'node_modules/',
        'scripts/',
        'dist/',
        'tests/',
        '*.config.*',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
      ])
      expect(result.reporter).toEqual([])
      expect(result.customOptions).toEqual({
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      })
    })

    it('should merge custom options when provided', () => {
      const customOptions: Partial<MonocartCoverageOptions> = {
        outputDir: './custom-coverage',
        reports: ['json', 'html'],
        name: 'Custom Coverage',
        lcov: false,
      }

      const result = withMonocartProvider(customOptions)

      expect(result.customOptions).toEqual({
        outputDir: './custom-coverage',
        reports: ['json', 'html'],
        logging: 'info',
        lcov: false,
        name: 'Custom Coverage',
      })
    })

    it('should handle empty options object', () => {
      const result = withMonocartProvider({})

      expect(result.customOptions).toEqual({
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      })
    })

    it('should handle null argument', () => {
      // @ts-expect-error Testing null case
      const result = withMonocartProvider(null)

      expect(result.customOptions).toEqual({
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      })
    })
  })

  describe('full-config mode', () => {
    it('should merge with empty Vite config', () => {
      const viteConfig: ViteUserConfig = {}
      const result = withMonocartProvider(viteConfig)

      // Empty config should be treated as options-only mode according to the logic
      // @ts-expect-error - provider exists on resolved config
      expect(result.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(result.customProviderModule).toBe('@oorabona/vitest-monocart-coverage')
      // @ts-expect-error - enabled exists on resolved config
      expect(result.enabled).toBe(true)
      // @ts-expect-error - clean exists on resolved config
      expect(result.clean).toBe(true)
    })

    it('should merge with existing Vite config with test section', () => {
      const viteConfig: ViteUserConfig = {
        test: {
          globals: true,
          environment: 'node',
        },
      }
      const customOptions: Partial<MonocartCoverageOptions> = {
        outputDir: './custom-output',
        name: 'Test Coverage',
      }

      const result = withMonocartProvider(viteConfig, customOptions)

      // @ts-expect-error - globals exists on test config
      expect(result.test?.globals).toBe(true)
      // @ts-expect-error - environment exists on test config
      expect(result.test?.environment).toBe('node')
      expect(result.test?.coverage?.provider).toBe('custom')
      expect(result.test?.coverage?.customOptions?.outputDir).toBe('./custom-output')
      expect(result.test?.coverage?.customOptions?.name).toBe('Test Coverage')
    })

    it('should preserve existing coverage config and merge with custom options', () => {
      const viteConfig: ViteUserConfig = {
        test: {
          coverage: {
            enabled: false,
            clean: false,
            include: ['lib/**/*'],
            exclude: ['lib/**/*.spec.ts'],
            extension: ['.ts', '.js'],
            all: true,
            cleanOnRerun: true,
            thresholds: {
              lines: 80,
              functions: 80,
              branches: 80,
              statements: 80,
            },
            reportOnFailure: true,
            allowExternal: true,
            processingConcurrency: 4,
            reporter: ['text', 'json'],
            // @ts-expect-error - customOptions exists in coverage config
            customOptions: {
              outputDir: './existing-coverage',
              name: 'Existing Coverage',
            },
          },
        },
      }

      const customOptions: Partial<MonocartCoverageOptions> = {
        reports: ['html', 'lcov'],
        logging: 'debug',
      }

      const result = withMonocartProvider(viteConfig, customOptions)

      const coverage = result.test?.coverage
      expect(coverage?.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(coverage?.customProviderModule).toBe('@oorabona/vitest-monocart-coverage')
      expect(coverage?.enabled).toBe(false) // preserved
      expect(coverage?.clean).toBe(false) // preserved
      expect(coverage?.include).toEqual(['lib/**/*']) // preserved
      expect(coverage?.exclude).toEqual(['lib/**/*.spec.ts']) // preserved
      expect(coverage?.extension).toEqual(['.ts', '.js']) // preserved
      expect(coverage?.all).toBe(true) // preserved
      expect(coverage?.cleanOnRerun).toBe(true) // preserved
      expect(coverage?.thresholds).toEqual({
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      }) // preserved
      expect(coverage?.reportOnFailure).toBe(true) // preserved
      expect(coverage?.allowExternal).toBe(true) // preserved
      expect(coverage?.processingConcurrency).toBe(4) // preserved
      expect(coverage?.reporter).toEqual(['text', 'json']) // preserved

      expect(coverage?.customOptions).toEqual({
        outputDir: './existing-coverage', // from existing
        name: 'Existing Coverage', // from existing
        reports: ['html', 'lcov'], // from custom options
        logging: 'debug', // from custom options
      })
    })

    it('should handle config with plugins array', () => {
      const viteConfig: ViteUserConfig = {
        plugins: [],
        test: {
          globals: true,
        },
      }

      const result = withMonocartProvider(viteConfig)

      expect(result.plugins).toEqual([])
      // @ts-expect-error - globals exists on test config
      expect(result.test?.globals).toBe(true)
      expect(result.test?.coverage?.provider).toBe('custom')
      expect(result.test?.coverage?.customOptions).toEqual({
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      })
    })

    it('should handle config with test but no coverage section', () => {
      const viteConfig: ViteUserConfig = {
        test: {
          environment: 'jsdom',
          globals: false,
        },
      }

      const customOptions: Partial<MonocartCoverageOptions> = {
        outputDir: './jsdom-coverage',
      }

      const result = withMonocartProvider(viteConfig, customOptions)

      // @ts-expect-error - environment exists on test config
      expect(result.test?.environment).toBe('jsdom')
      // @ts-expect-error - globals exists on test config
      expect(result.test?.globals).toBe(false)
      expect(result.test?.coverage?.enabled).toBe(true)
      expect(result.test?.coverage?.customOptions?.outputDir).toBe('./jsdom-coverage')
    })

    it('should handle undefined second argument', () => {
      const viteConfig: ViteUserConfig = {
        test: {
          environment: 'node',
        },
      }

      const result = withMonocartProvider(viteConfig, undefined)

      expect(result.test?.coverage?.customOptions).toEqual({
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      })
    })

    it('should handle when second argument is completely omitted', () => {
      const viteConfig: ViteUserConfig = {
        server: {
          port: 3000,
        },
        test: {
          globals: true,
        },
      }

      // Call without any second argument to trigger the default parameter handling
      const fn = withMonocartProvider as (config: ViteUserConfig, options?: any) => any
      const result = fn(viteConfig)

      expect(result.test?.globals).toBe(true)
      expect(result.test?.coverage?.provider).toBe('custom')
      expect(result.test?.coverage?.customOptions).toEqual({
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      })
    })

    it('should detect config vs options by presence of test property', () => {
      const configLikeObject = {
        test: {
          globals: true,
        },
      }

      const result = withMonocartProvider(configLikeObject)

      // @ts-expect-error - globals exists on test config
      expect(result.test?.globals).toBe(true)
      expect(result.test?.coverage?.provider).toBe('custom')
    })

    it('should detect config vs options by presence of plugins property', () => {
      const configLikeObject = {
        plugins: [],
      }

      const result = withMonocartProvider(configLikeObject)

      expect(result.plugins).toEqual([])
      expect(result.test?.coverage?.provider).toBe('custom')
    })

    it('should treat object without test or plugins as options', () => {
      const optionsLikeObject = {
        outputDir: './options-coverage',
        name: 'Options Coverage',
      }

      const result = withMonocartProvider(optionsLikeObject)

      // Should be treated as coverage config, not full Vite config
      expect(result.provider).toBe('custom')
      expect(result.customOptions?.outputDir).toBe('./options-coverage')
      expect(result.customOptions?.name).toBe('Options Coverage')
      expect('test' in result).toBe(false)
    })
  })
})

describe('createMonocartConfig', () => {
  it('should return default configuration when called with no arguments', () => {
    const result = createMonocartConfig()

    expect(result).toEqual({
      provider: 'custom',
      customProviderModule: '@oorabona/vitest-monocart-coverage',
      enabled: true,
      clean: true,
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
      reporter: [],
      customOptions: {
        outputDir: './coverage',
        reports: ['v8'],
        logging: 'info',
      },
    })
  })

  it('should merge custom options with defaults', () => {
    const customOptions: Partial<MonocartCoverageOptions> = {
      outputDir: './my-coverage',
      reports: ['json-summary', 'text'],
      name: 'My Project Coverage',
      logging: 'debug',
      lcov: false,
    }

    const result = createMonocartConfig(customOptions)

    expect(result.customOptions).toEqual({
      outputDir: './my-coverage',
      reports: ['json-summary', 'text'],
      logging: 'debug',
      lcov: false,
      name: 'My Project Coverage',
    })
  })

  it('should handle empty options object', () => {
    const result = createMonocartConfig({})

    expect(result.customOptions).toEqual({
      outputDir: './coverage',
      reports: ['v8'],
      logging: 'info',
    })
  })

  it('should preserve all static configuration values', () => {
    const customOptions: Partial<MonocartCoverageOptions> = {
      name: 'Test Coverage',
    }

    const result = createMonocartConfig(customOptions)

    expect(result.provider).toBe('custom')
    // @ts-expect-error - customProviderModule exists on resolved config
    expect(result.customProviderModule).toBe('@oorabona/vitest-monocart-coverage')
    expect(result.enabled).toBe(true)
    expect(result.clean).toBe(true)
    expect(result.include).toEqual(['src/**/*'])
    expect(result.exclude).toEqual([
      'node_modules/',
      'scripts/',
      'dist/',
      'tests/',
      '*.config.*',
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*',
    ])
    expect(result.reporter).toEqual([])
  })
})
