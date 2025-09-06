import type { ResolvedCoverageOptions, Vitest } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MonocartBrowserProvider, MonocartBrowserProviderModule } from '../src/browser-provider.js'

// Mock the reporter and config modules
vi.mock('../src/reporter.js', () => ({
  MonocartReporter: {
    create: vi.fn().mockResolvedValue({
      addCoverageData: vi.fn(),
      generateReport: vi.fn(),
      config: {
        name: 'Test Coverage',
        outputDir: './test-coverage',
        css: true,
      },
    }),
  },
}))

vi.mock('../src/config.js', () => ({
  resolveMonocartConfig: vi.fn().mockResolvedValue({
    name: 'Test Coverage',
    outputDir: './test-coverage',
    css: true,
  }),
}))

// Mock browser globals
const mockCDPSession = {
  send: vi.fn(),
  on: vi.fn(),
}

Object.defineProperty(globalThis, 'window', {
  value: {
    __vitest_browser_runner__: {
      cdp: mockCDPSession,
    },
    location: {
      origin: 'http://localhost:3000',
    },
  },
  writable: true,
})

describe('MonocartBrowserProvider', () => {
  let provider: MonocartBrowserProvider
  let mockCtx: Partial<Vitest>

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new MonocartBrowserProvider()
    mockCtx = {
      config: {
        coverage: {
          provider: 'custom',
          customProviderModule: '@oorabana/vitest-monocart-coverage/browser',
          customOptions: {
            name: 'Test Coverage',
            outputDir: './test-coverage',
            css: true,
          },
          clean: true,
        } as unknown as ResolvedCoverageOptions<'custom'>,
      },
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        log: vi.fn(),
      },
    } as unknown as Partial<Vitest>
  })

  it('should have correct provider name', () => {
    expect(provider.name).toBe('v8')
  })

  it('should initialize with Vitest context', async () => {
    await provider.initialize(mockCtx as Vitest)

    expect(provider.options).toBeDefined()
    expect(provider.options.provider).toBe('v8')
  })

  it('should resolve options correctly', async () => {
    await provider.initialize(mockCtx as Vitest)
    const options = provider.resolveOptions()

    expect(options).toBeDefined()
    expect(options.provider).toBe('v8')
  })

  it('should have provider available', () => {
    expect(provider.hasProvider()).toBe(true)
  })

  it('should handle clean method correctly', async () => {
    await provider.initialize(mockCtx as Vitest)
    await expect(provider.clean()).resolves.toBeUndefined()
    await expect(provider.clean(true)).resolves.toBeUndefined()
    await expect(provider.clean(false)).resolves.toBeUndefined()
  })

  it('should handle generateCoverage method', () => {
    const result = provider.generateCoverage({} as any)
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  describe('browser-specific functionality', () => {
    beforeEach(async () => {
      await provider.initialize(mockCtx as Vitest)
    })

    it('should start coverage collection on browser environment', async () => {
      const meta = {
        coverage: null,
        transformMode: 'ssr' as 'ssr',
        projectName: 'test',
        testFiles: [],
      }

      mockCDPSession.send.mockResolvedValue({})

      await provider.onAfterSuiteRun(meta)

      // Should have attempted to enable profiler and CSS coverage
      expect(mockCDPSession.send).toHaveBeenCalledWith('Profiler.enable')
      expect(mockCDPSession.send).toHaveBeenCalledWith('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true,
      })
      expect(mockCDPSession.send).toHaveBeenCalledWith('CSS.enable')
      expect(mockCDPSession.send).toHaveBeenCalledWith('CSS.startRuleUsageTracking')
    })

    it('should handle coverage collection with results', async () => {
      const meta = {
        coverage: null,
        transformMode: 'ssr' as 'ssr',
        projectName: 'test',
        testFiles: [],
      }

      mockCDPSession.send.mockImplementation((method: string, _params?: any) => {
        if (method === 'Profiler.takePreciseCoverage') {
          return Promise.resolve({
            result: [
              {
                scriptId: 'script1',
                url: 'http://localhost:3000/src/test.js',
                source: null,
                functions: [],
              },
            ],
          })
        }
        return Promise.resolve({})
      })

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
        config: { css: true },
      }
      ;(provider as any).reporter = mockReporter
      ;(provider as any).scriptSources = new Map([['script1', 'console.log("test")']])

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalled()
    })

    it('should filter out system files correctly', async () => {
      const meta = {
        coverage: null,
        transformMode: 'ssr' as 'ssr',
        projectName: 'test',
        testFiles: [],
      }

      mockCDPSession.send.mockImplementation((method: string) => {
        if (method === 'Profiler.takePreciseCoverage') {
          return Promise.resolve({
            result: [
              {
                scriptId: 'script1',
                url: 'http://localhost:3000/src/app.js',
                source: null,
                functions: [],
              },
              {
                scriptId: 'script2',
                url: 'http://localhost:3000/node_modules/lib.js',
                source: null,
                functions: [],
              },
              {
                scriptId: 'script3',
                url: 'http://localhost:3000/__vitest__/test.js',
                source: null,
                functions: [],
              },
            ],
          })
        }
        return Promise.resolve({})
      })

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
        config: { css: true },
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            url: 'src/app.js', // Should be filtered and processed
          }),
        ]),
      )

      // Should not contain system files
      const callArgs = mockReporter.addCoverageData.mock.calls[0][0]
      expect(callArgs).not.toContain(
        expect.objectContaining({
          url: expect.stringContaining('node_modules'),
        }),
      )
      expect(callArgs).not.toContain(
        expect.objectContaining({
          url: expect.stringContaining('__vitest__'),
        }),
      )
    })

    it('should handle @fs/ prefix in URLs', async () => {
      const meta = {
        coverage: null,
        transformMode: 'ssr' as 'ssr',
        projectName: 'test',
        testFiles: [],
      }

      mockCDPSession.send.mockImplementation((method: string) => {
        if (method === 'Profiler.takePreciseCoverage') {
          return Promise.resolve({
            result: [
              {
                scriptId: 'script1',
                url: 'http://localhost:3000/@fs/src/app.js',
                source: null,
                functions: [],
              },
            ],
          })
        }
        return Promise.resolve({})
      })

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
        config: { css: true },
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            url: 'src/app.js', // @fs/ prefix should be removed
          }),
        ]),
      )
    })

    it('should handle reportCoverage correctly', async () => {
      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.reportCoverage({}, { allTestsRun: true })
      expect(mockReporter.generateReport).toHaveBeenCalled()

      await provider.reportCoverage({}, { allTestsRun: false })
      // generateReport should have been called only once (from previous test)
      expect(mockReporter.generateReport).toHaveBeenCalledTimes(1)
    })

    it('should handle errors during coverage collection', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const meta = {
        coverage: null,
        transformMode: 'ssr' as 'ssr',
        projectName: 'test',
        testFiles: [],
      }

      mockCDPSession.send.mockRejectedValue(new Error('CDP error'))

      await provider.onAfterSuiteRun(meta)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MonocartBrowserProvider] Failed to start coverage:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })

    it('should handle missing CDP session gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock window without CDP session
      Object.defineProperty(globalThis, 'window', {
        value: {
          __vitest_browser_runner__: null,
          location: { origin: 'http://localhost:3000' },
        },
        writable: true,
      })

      const meta = {
        coverage: null,
        transformMode: 'ssr' as 'ssr',
        projectName: 'test',
        testFiles: [],
      }

      await provider.onAfterSuiteRun(meta)

      expect(consoleSpy).toHaveBeenCalledWith('[MonocartBrowserProvider] CDP session not available')

      consoleSpy.mockRestore()

      // Restore original window mock
      Object.defineProperty(globalThis, 'window', {
        value: {
          __vitest_browser_runner__: { cdp: mockCDPSession },
          location: { origin: 'http://localhost:3000' },
        },
        writable: true,
      })
    })
  })
})

describe('MonocartBrowserProviderModule', () => {
  it('should export getProvider function', () => {
    expect(MonocartBrowserProviderModule.getProvider).toBeDefined()
    expect(typeof MonocartBrowserProviderModule.getProvider).toBe('function')
  })

  it('should return browser provider instance', () => {
    const provider = MonocartBrowserProviderModule.getProvider()

    expect(provider).toBeInstanceOf(MonocartBrowserProvider)
    expect(provider.name).toBe('v8')
  })

  it('should have takeCoverage method', () => {
    expect(MonocartBrowserProviderModule.takeCoverage).toBeDefined()
    expect(typeof MonocartBrowserProviderModule.takeCoverage).toBe('function')
    expect(MonocartBrowserProviderModule.takeCoverage()).toEqual({})
  })
})
