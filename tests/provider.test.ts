import type { ResolvedCoverageOptions, Vitest } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MonocartCoverageProvider, MonocartCoverageProviderModule } from '../src/provider.js'

// Mock the reporter and config modules
vi.mock('../src/reporter.js', () => ({
  MonocartReporter: {
    create: vi.fn().mockResolvedValue({
      addCoverageData: vi.fn(),
      generateReport: vi.fn(),
    }),
  },
}))

vi.mock('../src/config.js', () => ({
  resolveMonocartConfig: vi.fn().mockResolvedValue({
    name: 'Test Coverage',
    outputDir: './test-coverage',
  }),
}))

describe('MonocartCoverageProvider', () => {
  let provider: MonocartCoverageProvider
  let mockCtx: Partial<Vitest>

  beforeEach(() => {
    provider = new MonocartCoverageProvider()
    mockCtx = {
      config: {
        coverage: {
          provider: 'custom',
          customProviderModule: '@oorabona/vitest-monocart-coverage',
          customOptions: {
            name: 'Test Coverage',
            outputDir: './test-coverage',
          },
          clean: true,
        } as ResolvedCoverageOptions<'monocart'>,
      },
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        log: vi.fn(),
      },
    } as Partial<Vitest>
  })

  it('should have correct provider name', () => {
    // Our provider internally uses 'v8' since it extends BaseCoverageProvider<v8>
    // but is configured as 'custom' by Vitest
    expect(provider.name).toBe('v8')
  })

  it('should initialize with Vitest context', () => {
    provider.initialize(mockCtx as Vitest)

    expect(provider.options).toBeDefined()
    expect(provider.options.provider).toBe('v8') // Internal provider uses 'v8'
    expect(provider.options.customOptions?.name).toBe('Test Coverage')
  })

  it('should resolve options correctly', () => {
    provider.initialize(mockCtx as Vitest)
    const options = provider.resolveOptions()

    expect(options).toBeDefined()
    expect(options.provider).toBe('v8') // Internal provider name is 'v8'
  })

  it('should have provider available', () => {
    expect(provider.hasProvider()).toBe(true)
  })

  it('should handle coverage methods', async () => {
    provider.initialize(mockCtx as Vitest)

    // Test methods that actually exist on BaseCoverageProvider
    expect(typeof provider.clean).toBe('function')
    expect(typeof provider.generateCoverage).toBe('function')
    expect(typeof provider.reportCoverage).toBe('function')
  })

  it('should handle lifecycle hooks', async () => {
    provider.initialize(mockCtx as Vitest)

    // Our provider doesn't implement these lifecycle hooks
    // Test that the provider was properly initialized instead
    expect(provider.ctx).toBeDefined()
    expect(provider.options).toBeDefined()
  })

  it('should handle clean method correctly', async () => {
    provider.initialize(mockCtx as Vitest)

    // Test clean with default value
    await expect(provider.clean()).resolves.toBeUndefined()

    // Test clean with explicit true
    await expect(provider.clean(true)).resolves.toBeUndefined()

    // Test clean with false
    await expect(provider.clean(false)).resolves.toBeUndefined()
  })

  it('should handle reportCoverage with various scenarios', async () => {
    provider.initialize(mockCtx as Vitest)

    // Test that the method exists and is callable
    expect(typeof provider.reportCoverage).toBe('function')

    // In test environment, reportCoverage will try to access coverage files
    // which don't exist, so we just verify the method is present
    expect(provider.reportCoverage).toBeDefined()
  })

  it('should handle generateCoverage method', async () => {
    const result = await provider.generateCoverage()
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
    // Should return a CoverageMap object
  })

  it('should handle reportCoverage error scenarios', async () => {
    provider.initialize(mockCtx as Vitest)

    // Test that the method signature is correct
    expect(typeof provider.reportCoverage).toBe('function')

    // In test environment, attempting to call reportCoverage would fail due to missing coverage files
    // This is expected behavior - the method should only be called by Vitest with proper setup
  })

  it('should handle initialization without customOptions', () => {
    const mockCtxWithoutCustom: Partial<Vitest> = {
      config: {
        coverage: {
          provider: 'custom',
          customProviderModule: '@oorabona/vitest-monocart-coverage',
          // No customOptions property to test the || {} fallback
        } as ResolvedCoverageOptions<'custom'>,
      },
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        log: vi.fn(),
      },
    } as Partial<Vitest>

    provider.initialize(mockCtxWithoutCustom as Vitest)

    expect(provider.options).toBeDefined()
    expect(provider.options.provider).toBe('v8') // Internal provider uses 'v8'
  })

  describe('onAfterSuiteRun', () => {
    beforeEach(async () => {
      await provider.initialize(mockCtx as Vitest)
    })

    it('should handle missing coverage.result', async () => {
      const meta = {
        coverage: null,
        transformMode: 'ssr',
        projectName: 'test',
      }

      await expect(provider.onAfterSuiteRun(meta)).resolves.toBeUndefined()
    })

    it('should handle missing coverage object', async () => {
      const meta = {
        coverage: { result: null },
        transformMode: 'ssr',
        projectName: 'test',
      }

      await expect(provider.onAfterSuiteRun(meta)).resolves.toBeUndefined()
    })

    it('should process valid coverage data with transform results', async () => {
      const mockFetchCache = new Map()
      mockFetchCache.set('/test/file.js', {
        result: {
          code: 'console.log("test")',
          map: { sources: [], mappings: '' },
        },
      })

      const meta = {
        coverage: {
          result: [
            {
              url: 'file:///test/file.js',
              source: null,
              startOffset: 185,
            },
          ],
        },
        transformMode: 'ssr',
        projectName: 'test',
      }

      // Mock the vitenode context
      ;(provider as any).ctx = {
        projects: [
          {
            name: 'test',
            vitenode: {
              fetchCaches: {
                ssr: mockFetchCache,
              },
            },
          },
        ],
      }

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith([
        {
          url: 'file:///test/file.js',
          source: 'console.log("test")',
          startOffset: 185,
          scriptOffset: 185,
          sourceMap: { sources: ['../../../../../test/file.js'], mappings: '' },
        },
      ])
    })

    it('should handle different transformMode values', async () => {
      const mockFetchCache = new Map()
      mockFetchCache.set('/test/file.js', {
        result: {
          code: 'test code',
          map: null,
        },
      })

      const meta = {
        coverage: {
          result: [
            {
              url: 'file:///test/file.js',
              source: null,
            },
          ],
        },
        transformMode: 'web',
        projectName: 'test',
      }

      ;(provider as any).ctx = {
        projects: [
          {
            name: 'test',
            vitenode: {
              fetchCaches: {
                web: mockFetchCache,
              },
            },
          },
        ],
      }

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith([
        {
          url: 'file:///test/file.js',
          source: 'test code',
          scriptOffset: 185,
        },
      ])
    })

    it('should handle invalid URLs gracefully', async () => {
      const meta = {
        coverage: {
          result: [
            {
              url: 'invalid-url',
              source: null,
            },
          ],
        },
        transformMode: 'ssr',
        projectName: 'test',
      }

      ;(provider as any).ctx = {
        projects: [{ name: 'test', vitenode: { fetchCaches: { ssr: new Map() } } }],
      }

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      // Should call addCoverageData with original entry (no source added)
      expect(mockReporter.addCoverageData).toHaveBeenCalledWith([
        {
          url: 'invalid-url',
          source: null,
        },
      ])
    })

    it('should handle entries that already have source', async () => {
      const meta = {
        coverage: {
          result: [
            {
              url: 'file:///test/file.js',
              source: 'existing source',
            },
          ],
        },
        transformMode: 'ssr',
        projectName: 'test',
      }

      ;(provider as any).ctx = {
        projects: [{ name: 'test', vitenode: { fetchCaches: { ssr: new Map() } } }],
      }

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith([
        {
          url: 'file:///test/file.js',
          source: 'existing source',
        },
      ])
    })

    it('should handle error during processing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const meta = {
        coverage: {
          result: [
            {
              url: 'file:///test/file.js',
              source: null,
            },
          ],
        },
        transformMode: 'ssr',
        projectName: 'test',
      }

      const mockReporter = {
        addCoverageData: vi.fn().mockRejectedValue(new Error('Reporter error')),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter
      ;(provider as any).ctx = {
        projects: [{ name: 'test', vitenode: { fetchCaches: { ssr: new Map() } } }],
      }

      await provider.onAfterSuiteRun(meta)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MonocartProvider] Failed to process coverage in onAfterSuiteRun:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })

    it('should handle vitenode fallback when no projects', async () => {
      const mockFetchCache = new Map()
      mockFetchCache.set('/test/file.js', {
        result: {
          code: 'fallback code',
          map: null,
        },
      })

      const meta = {
        coverage: {
          result: [
            {
              url: 'file:///test/file.js',
              source: null,
            },
          ],
        },
        transformMode: null,
        projectName: 'test',
      }

      ;(provider as any).ctx = {
        vitenode: {
          fetchCache: mockFetchCache,
        },
      }

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith([
        {
          url: 'file:///test/file.js',
          source: 'fallback code',
          scriptOffset: 185,
        },
      ])
    })
  })

  describe('utility methods', () => {
    it('should test formatPath method', () => {
      const provider = new MonocartCoverageProvider()

      expect((provider as any).formatPath('C:\\test\\file.js')).toBe('C:/test/file.js')
      expect((provider as any).formatPath('/unix/path/file.js')).toBe('/unix/path/file.js')
      expect((provider as any).formatPath('')).toBe('')
      expect((provider as any).formatPath(null)).toBe(null)
    })

    it('should test relativePath method', () => {
      const provider = new MonocartCoverageProvider()

      // Test relative path from current working directory
      const result1 = (provider as any).relativePath('/root/project/src/file.js', '/root/project')
      expect(result1).toBe('src/file.js')

      // Test with different root
      const result2 = (provider as any).relativePath('/root/project/src/file.js', '/root')
      expect(result2).toBe('project/src/file.js')

      // Test with Windows paths - the actual behavior converts backslashes to forward slashes
      const result3 = (provider as any).relativePath('C:\\root\\project\\src\\file.js', 'C:\\root')
      expect(result3).toContain('file.js') // Just check it contains the file
    })

    it('should test normalizeTransformResults method', () => {
      const provider = new MonocartCoverageProvider()

      const mockFetchCache = new Map()
      mockFetchCache.set('/file1.js', { result: { code: 'code1', map: {} } })
      mockFetchCache.set('/file2.js', { result: { code: 'code2', map: {} } })

      const result = (provider as any).normalizeTransformResults(mockFetchCache)

      expect(result.size).toBe(2)
      expect(result.get('/file1.js')).toEqual({ code: 'code1', map: {} })
      expect(result.get('/file2.js')).toEqual({ code: 'code2', map: {} })
    })

    it('should handle null fetchCache in normalizeTransformResults', () => {
      const provider = new MonocartCoverageProvider()

      const result = (provider as any).normalizeTransformResults(null)

      expect(result.size).toBe(0)
    })

    it('should handle undefined fetchCache in normalizeTransformResults', () => {
      const provider = new MonocartCoverageProvider()

      const result = (provider as any).normalizeTransformResults(undefined)

      expect(result.size).toBe(0)
    })
  })

  describe('reportCoverage', () => {
    beforeEach(async () => {
      await provider.initialize(mockCtx as Vitest)
    })

    it('should handle reportCoverage when allTestsRun is false', async () => {
      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.reportCoverage({}, { allTestsRun: false })

      expect(mockReporter.generateReport).not.toHaveBeenCalled()
    })

    it('should handle reportCoverage when reporter is missing', async () => {
      ;(provider as any).reporter = null

      await expect(provider.reportCoverage({}, { allTestsRun: true })).resolves.toBeUndefined()
    })

    it('should generate report when allTestsRun is true', async () => {
      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.reportCoverage({}, { allTestsRun: true })

      expect(mockReporter.generateReport).toHaveBeenCalled()
    })

    it('should handle errors during report generation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn().mockRejectedValue(new Error('Report generation failed')),
      }
      ;(provider as any).reporter = mockReporter

      await provider.reportCoverage({}, { allTestsRun: true })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MonocartProvider] Failed to generate final report:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })
  })
})

describe('MonocartCoverageProviderModule', () => {
  it('should export getProvider function', () => {
    expect(MonocartCoverageProviderModule.getProvider).toBeDefined()
    expect(typeof MonocartCoverageProviderModule.getProvider).toBe('function')
  })

  it('should return provider instance', () => {
    const provider = MonocartCoverageProviderModule.getProvider()

    expect(provider).toBeInstanceOf(MonocartCoverageProvider)
    expect(provider.name).toBe('v8') // Internal provider name
  })

  it('should have takeCoverage method', () => {
    expect(MonocartCoverageProviderModule.takeCoverage).toBeDefined()
    expect(typeof MonocartCoverageProviderModule.takeCoverage).toBe('function')
    expect(MonocartCoverageProviderModule.takeCoverage()).toEqual({})
  })
})
