import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResolvedCoverageOptions, Vitest } from 'vitest/node'
import { MonocartBrowserProvider } from '../src/browser-provider.js'

// Mock the reporter and config modules (Node context)
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
    logging: 'debug',
  }),
}))

describe('MonocartBrowserProvider (Node)', () => {
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
  })

  it('should handle generateCoverage method', () => {
    const result = provider.generateCoverage({} as any)
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  describe('onAfterSuiteRun data handling', () => {
    beforeEach(async () => {
      await provider.initialize(mockCtx as Vitest)
    })

    it('should process coverage data from meta and forward to reporter', async () => {
      const meta: any = {
        coverage: {
          result: [
            {
              scriptId: '1',
              url: 'src/app.js',
              source: 'console.log(1)\n',
              functions: [],
            },
          ],
        },
      }

      const mockReporter = {
        addCoverageData: vi.fn(),
        generateReport: vi.fn(),
      }
      ;(provider as any).reporter = mockReporter

      await provider.onAfterSuiteRun(meta)

      expect(mockReporter.addCoverageData).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ url: 'src/app.js' })]),
      )
    })

    it('should warn when no coverage data is present', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const meta: any = { coverage: null }
      await provider.onAfterSuiteRun(meta)
      expect(warnSpy).toHaveBeenCalledWith(
        '[browser-provider] No coverage data or reporter unavailable',
      )
      warnSpy.mockRestore()
    })

    it('should log error when reporter fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const meta: any = {
        coverage: {
          result: [{ scriptId: '1', url: 'src/app.js', source: 'x', functions: [] }],
        },
      }
      const badReporter = { addCoverageData: vi.fn().mockRejectedValue(new Error('boom')) }
      ;(provider as any).reporter = badReporter
      await provider.onAfterSuiteRun(meta)
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })
})
