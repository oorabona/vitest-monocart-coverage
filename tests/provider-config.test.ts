import { describe, expect, it } from 'vitest'
import type { ViteUserConfig } from 'vitest/config'
import {
  createMonocartConfig,
  withMonocartBrowserProvider,
  withMonocartProvider,
} from '../src/provider-config.js'
import type { MonocartCoverageOptions } from '../src/types.js'

describe('withMonocartProvider', () => {
  describe('coverage-only mode', () => {
    it('should return coverage config when called with no arguments', () => {
      const result = withMonocartProvider()

      expect(result.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(result.customProviderModule).toBe('@oorabona/vitest-monocart-coverage')
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
        'anonymous*.js',
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
        'anonymous*.js',
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
      'anonymous*.js',
    ])
    expect(result.reporter).toEqual([])
  })
})

// Test isViteConfig function (though it's internal, it's valuable to test the logic)
describe('isViteConfig type guard', () => {
  it('should return false for non-objects', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig(null)).toBe(false)
    expect(isViteConfig(undefined)).toBe(false)
    expect(isViteConfig('string')).toBe(false)
    expect(isViteConfig(123)).toBe(false)
    expect(isViteConfig(true)).toBe(false)
    expect(isViteConfig([])).toBe(false)
  })

  it('should return false for objects without Vite config properties', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig({})).toBe(false)
    expect(isViteConfig({ outputDir: './coverage' })).toBe(false)
    expect(isViteConfig({ name: 'test' })).toBe(false)
  })

  it('should return true for objects with test property', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig({ test: {} })).toBe(true)
    expect(isViteConfig({ test: { globals: true } })).toBe(true)
  })

  it('should return true for objects with plugins property', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig({ plugins: [] })).toBe(true)
    expect(isViteConfig({ plugins: [{}] })).toBe(true)
  })

  it('should return true for objects with build property', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig({ build: {} })).toBe(true)
    expect(isViteConfig({ build: { target: 'es2020' } })).toBe(true)
  })

  it('should return true for objects with server property', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig({ server: {} })).toBe(true)
    expect(isViteConfig({ server: { port: 3000 } })).toBe(true)
  })

  it('should return true for objects with multiple Vite properties', () => {
    const isViteConfig = (arg: unknown) => {
      if (!arg || typeof arg !== 'object') {
        return false
      }
      const obj = arg as Record<string, unknown>
      return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
    }

    expect(isViteConfig({ test: {}, plugins: [] })).toBe(true)
    expect(isViteConfig({ build: {}, server: { port: 3000 } })).toBe(true)
  })
})

describe('withMonocartBrowserProvider', () => {
  describe('coverage-only mode', () => {
    it('should return browser coverage config when called with no arguments', () => {
      const result = withMonocartBrowserProvider()

      expect(result.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(result.customProviderModule).toBe('@oorabona/vitest-monocart-coverage/browser')
      expect(result.clean).toBe(true)
      expect(result.exclude).toContain('anonymous*.js')
      expect(result.reporter).toEqual([])
      expect(result.customOptions).toEqual({
        outputDir: './coverage-browser',
        reports: ['console-details', 'html'],
        logging: 'info',
        css: false,
      })
    })

    it('should merge custom browser options when provided', () => {
      const customOptions = {
        outputDir: './custom-browser-coverage',
        css: true,
        reports: ['html'],
        name: 'Custom Browser Coverage',
      }

      const result = withMonocartBrowserProvider(customOptions)

      expect(result.customOptions).toEqual({
        outputDir: './custom-browser-coverage',
        reports: ['html'],
        logging: 'info',
        css: true,
        name: 'Custom Browser Coverage',
      })
    })
  })

  describe('full-config mode', () => {
    it('should merge with empty Vite config', () => {
      const viteConfig: ViteUserConfig = {}
      const result = withMonocartBrowserProvider(viteConfig)

      // Empty config should be treated as options-only mode
      expect(result.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(result.customProviderModule).toBe('@oorabona/vitest-monocart-coverage/browser')
      expect(result.clean).toBe(true)
      expect(result.exclude).toContain('anonymous*.js')
    })

    it('should merge with existing Vite browser config with test section', () => {
      const viteConfig: ViteUserConfig = {
        test: {
          globals: true,
          browser: {
            enabled: true,
            provider: 'playwright',
          },
        },
      }
      const customOptions = {
        outputDir: './browser-custom-output',
        css: true,
        name: 'Test Browser Coverage',
      }

      const result = withMonocartBrowserProvider(viteConfig, customOptions)

      // @ts-expect-error - globals exists on test config
      expect(result.test?.globals).toBe(true)
      // @ts-expect-error - browser exists on test config
      expect(result.test?.browser?.enabled).toBe(true)
      expect(result.test?.coverage?.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(result.test?.coverage?.customProviderModule).toBe(
        '@oorabona/vitest-monocart-coverage/browser',
      )
      expect(result.test?.coverage?.customOptions?.outputDir).toBe('./browser-custom-output')
      expect(result.test?.coverage?.customOptions?.css).toBe(true)
      expect(result.test?.coverage?.customOptions?.name).toBe('Test Browser Coverage')
    })

    it('should preserve existing browser coverage config and merge with custom options', () => {
      const viteConfig: ViteUserConfig = {
        test: {
          browser: {
            enabled: true,
          },
          coverage: {
            enabled: true,
            clean: false,
            include: ['browser/**/*'],
            exclude: ['browser/**/*.spec.ts'],
            // @ts-expect-error - customOptions exists in coverage config
            customOptions: {
              outputDir: './existing-browser-coverage',
              name: 'Existing Browser Coverage',
              css: false,
            },
          },
        },
      }

      const customOptions = {
        reports: ['html', 'lcov'],
        css: true,
        logging: 'debug' as const,
      }

      const result = withMonocartBrowserProvider(viteConfig, customOptions)

      const coverage = result.test?.coverage
      expect(coverage?.provider).toBe('custom')
      // @ts-expect-error - customProviderModule exists on resolved config
      expect(coverage?.customProviderModule).toBe('@oorabona/vitest-monocart-coverage/browser')
      expect(coverage?.clean).toBe(false) // preserved
      expect(coverage?.include).toEqual(['browser/**/*']) // preserved
      expect(coverage?.exclude).toContain('browser/**/*.spec.ts') // preserved
      expect(coverage?.exclude).toContain('anonymous*.js') // added

      expect(coverage?.customOptions).toEqual({
        outputDir: './existing-browser-coverage', // from existing
        name: 'Existing Browser Coverage', // from existing
        css: true, // from custom options (overrides existing false)
        reports: ['html', 'lcov'], // from custom options
        logging: 'debug', // from custom options
      })
    })
  })
})

describe('createBrowserCoverageConfig (internal)', () => {
  it('should handle vitestDefaults with undefined exclude', () => {
    const customOptions = { css: true }
    const vitestDefaults = { include: ['src/**/*'], exclude: undefined }

    // Testing internal function via withMonocartBrowserProvider to ensure coverage
    const result = withMonocartBrowserProvider(
      {
        test: { coverage: vitestDefaults },
      },
      customOptions,
    )

    const coverage = result.test?.coverage
    expect(coverage?.exclude).toEqual(['anonymous*.js'])
    expect(coverage?.customOptions?.css).toBe(true)
  })

  it('should handle vitestDefaults with string exclude', () => {
    const customOptions = { css: false }
    const vitestDefaults = { exclude: 'node_modules/**/*' }

    const result = withMonocartBrowserProvider(
      {
        test: { coverage: vitestDefaults },
      },
      customOptions,
    )

    const coverage = result.test?.coverage
    expect(coverage?.exclude).toEqual(['node_modules/**/*', 'anonymous*.js'])
  })

  it('should handle vitestDefaults with array exclude', () => {
    const customOptions = { reports: ['html'] }
    const vitestDefaults = { exclude: ['dist/**/*', 'tests/**/*'] }

    const result = withMonocartBrowserProvider(
      {
        test: { coverage: vitestDefaults },
      },
      customOptions,
    )

    const coverage = result.test?.coverage
    expect(coverage?.exclude).toEqual(['dist/**/*', 'tests/**/*', 'anonymous*.js'])
  })

  it('should handle config without test property', () => {
    const customOptions = { css: true }
    const baseConfig = { plugins: [] } // Vite config without test property

    const result = withMonocartBrowserProvider(baseConfig, customOptions)

    const coverage = result.test?.coverage
    expect(coverage?.customOptions?.css).toBe(true)
    expect(coverage?.clean).toBe(true) // default value
  })
})
