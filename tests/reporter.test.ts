import { existsSync, rmSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MonocartReporter } from '../src/reporter.js'
import type { RequiredMonocartCoverageOptions } from '../src/types.js'

const createFullConfig = (
  overrides: Partial<RequiredMonocartCoverageOptions> = {},
): RequiredMonocartCoverageOptions => ({
  name: 'Vitest Monocart Coverage',
  outputDir: './coverage',
  reports: ['v8', 'console-details'],
  lcov: true,
  sourcePath: 'src',
  sourceFilter: () => true,
  cleanCache: true,
  logging: 'info',
  css: false,
  onEnd: () => {},
  ...overrides,
})

vi.mock('node:fs')
vi.mock('monocart-coverage-reports', () => ({
  default: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('MonocartReporter', () => {
  const mockExistsSync = vi.mocked(existsSync)
  const mockRmSync = vi.mocked(rmSync)

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock existsSync globally to prevent config file lookups by default
    mockExistsSync.mockImplementation(path => {
      if (typeof path === 'string' && path.includes('monocart.config.')) {
        return false // No config files exist, avoid lookup errors
      }
      return false // Default to false for other paths
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create reporter with default config', async () => {
    const reporter = await MonocartReporter.create(createFullConfig())
    expect(reporter).toBeInstanceOf(MonocartReporter)
  })

  it('should create reporter with custom config', async () => {
    const reporter = await MonocartReporter.create(
      createFullConfig({
        name: 'Custom Reporter',
        outputDir: './custom-output',
        reports: ['v8'],
      }),
    )
    expect(reporter).toBeInstanceOf(MonocartReporter)
  })

  it('should clean output directory when it exists', async () => {
    mockRmSync.mockImplementation(() => {})

    // Override mock for this test
    mockExistsSync.mockImplementation(path => {
      if (typeof path === 'string' && path.includes('monocart.config.')) {
        return false // No config files exist
      }
      return path === './test-coverage' // Only test-coverage directory exists
    })

    const reporter = await MonocartReporter.create(
      createFullConfig({
        outputDir: './test-coverage',
        name: 'Test Coverage',
      }),
    )

    await reporter.clean()

    expect(mockExistsSync).toHaveBeenCalledWith('./test-coverage')
    expect(mockRmSync).toHaveBeenCalledWith('./test-coverage', {
      recursive: true,
      force: true,
    })
  })

  it('should not clean when directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false)

    const reporter = await MonocartReporter.create(
      createFullConfig({
        outputDir: './test-coverage',
        name: 'Test Coverage',
      }),
    )

    await reporter.clean()

    expect(mockExistsSync).toHaveBeenCalledWith('./test-coverage')
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  it('should handle clean errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockExistsSync.mockReturnValue(true)
    mockRmSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const reporter = await MonocartReporter.create(
      createFullConfig({
        outputDir: './test-coverage',
        name: 'Test Coverage',
      }),
    )

    await reporter.clean()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[reporter] Failed to clean coverage directory'),
    )

    consoleSpy.mockRestore()
  })

  it('should generate report successfully', async () => {
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig())

    const mockCoverageData = [
      {
        url: 'file:///test.js',
        source: 'test source',
        functions: [],
      },
    ]

    await reporter.generateReport(mockCoverageData)

    expect(MCR).toHaveBeenCalledWith({
      name: 'Vitest Monocart Coverage',
      outputDir: './coverage',
      reports: ['v8', 'console-details'],
      lcov: true,
      sourcePath: 'src',
      sourceFilter: expect.any(Function),
      cleanCache: true,
      logging: 'info',
      css: false,
      onEnd: expect.any(Function),
    })

    expect(mockMcr.add).toHaveBeenCalledWith(mockCoverageData)
    expect(mockMcr.generate).toHaveBeenCalled()
  })

  it('should handle report generation without coverage data', async () => {
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig())

    await reporter.generateReport()

    expect(mockMcr.add).not.toHaveBeenCalled()
    expect(mockMcr.generate).toHaveBeenCalled()
  })

  it('should handle generation errors', async () => {
    const MCR = (await import('monocart-coverage-reports')).default
    const error = new Error('Generation failed')
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockRejectedValue(error),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig())

    await expect(reporter.generateReport()).rejects.toThrow('Generation failed')
  })

  it('should handle V8 coverage data arrays', async () => {
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig())

    // Test with V8 array format
    const mockV8CoverageData = [
      {
        url: 'file:///test2.js',
        source: 'test source 2',
        functions: [{ functionName: 'test', ranges: [], isBlockCoverage: false }],
      },
    ]

    await reporter.generateReport(mockV8CoverageData)

    expect(mockMcr.add).toHaveBeenCalled()
    expect(mockMcr.generate).toHaveBeenCalled()
  })

  it('should warn about non-V8 coverage data', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig({ logging: 'warn' }))

    // Test with non-V8 coverage data (non-array)
    await reporter.generateReport('invalid')

    expect(mockMcr.add).not.toHaveBeenCalled()
    expect(mockMcr.generate).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[reporter] Non-V8 coverage data provided to generateReport, skipping transformation',
    )

    consoleSpy.mockRestore()
  })

  it('should handle non-V8 coverage data gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig({ logging: 'debug' }))

    // Test with non-V8 data format
    const problematicData = {
      someOtherFormat: 'invalid',
      data: [
        {
          // This is not V8 format
          functions: null,
        },
      ],
    }

    await reporter.generateReport(problematicData)

    expect(mockMcr.generate).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[reporter] Non-V8 coverage data provided to generateReport, skipping transformation',
    )

    consoleSpy.mockRestore()
  })

  it('should handle initialization failure', async () => {
    const MCR = (await import('monocart-coverage-reports')).default

    // Mock MCR constructor to throw an error during initialization
    vi.mocked(MCR).mockImplementation(() => {
      throw new Error('Initialization failed')
    })

    const reporter = await MonocartReporter.create(createFullConfig())

    // This should catch the error during MCR instantiation
    await expect(reporter.generateReport()).rejects.toThrow('Initialization failed')
  })

  it('should handle non-V8 data with debug logging', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig({ logging: 'debug' }))

    // Non-V8 data format
    const nonV8Data = {
      data: [
        {
          url: 'file:///test.js',
          functions: [],
        },
      ],
    }

    await reporter.generateReport(nonV8Data)

    expect(mockMcr.generate).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[reporter] Non-V8 coverage data provided to generateReport, skipping transformation',
    )

    consoleSpy.mockRestore()
  })

  it('should handle non-V8 data with info logging', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig({ logging: 'info' }))

    // Non-V8 data format
    const problematicData = {
      data: [
        {
          url: 'file:///test.js',
          functions: [],
        },
      ],
    }

    await reporter.generateReport(problematicData)

    expect(mockMcr.generate).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      '[reporter] Non-V8 coverage data provided to generateReport, skipping transformation',
    )

    consoleSpy.mockRestore()
  })

  it('should handle coverage data with non-array functions', async () => {
    const MCR = (await import('monocart-coverage-reports')).default
    const mockMcr = {
      add: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(MCR).mockImplementation(() => mockMcr as any)

    const reporter = await MonocartReporter.create(createFullConfig())

    // Test with functions that is NOT an array (to cover the : [] branch)
    const coverageDataWithNonArrayFunctions = [
      {
        url: 'file:///test.js',
        source: 'test source',
        functions: 'not-an-array', // This will trigger the : [] fallback
      },
    ]

    await reporter.generateReport(coverageDataWithNonArrayFunctions)

    expect(mockMcr.add).toHaveBeenCalledWith([
      {
        url: 'file:///test.js',
        source: 'test source',
        functions: [], // Should fallback to empty array
      },
    ])
    expect(mockMcr.generate).toHaveBeenCalled()
  })
})

describe('MonocartReporter sourceFilter normalization', () => {
  it('should handle HTTP URLs correctly', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
    })

    const reporter = await MonocartReporter.create(config)

    // Access the normalized filter directly via private method testing
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('http://localhost:3000/src/component.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/component.ts')
  })

  it('should handle HTTPS URLs correctly', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('https://localhost:5173/src/utils/helper.js')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/utils/helper.js')
  })

  it('should handle malformed URLs gracefully', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('http://[invalid-url')

    expect(mockSourceFilter).toHaveBeenCalledWith('http://[invalid-url')
  })

  it('should handle @fs/ prefix removal', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('@fs/src/component.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/component.ts')
  })

  it('should handle leading slash removal', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('//src/component.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/component.ts')
  })

  it('should handle backslash to forward slash conversion', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('src\\component.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/component.ts')
  })

  it('should prepend sourcePath for files without directory', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
      sourcePath: 'src',
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('component.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/component.ts')
  })

  it('should not prepend sourcePath for files with directory', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
      sourcePath: 'src',
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('lib/utils.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('lib/utils.ts')
  })

  it('should handle sourcePath with trailing slash', async () => {
    const mockSourceFilter = vi.fn().mockReturnValue(true)
    const config = createFullConfig({
      sourceFilter: mockSourceFilter,
      sourcePath: 'src/',
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    normalizedFilter('component.ts')

    expect(mockSourceFilter).toHaveBeenCalledWith('src/component.ts')
  })

  it('should return true when sourceFilter is undefined', async () => {
    const config = createFullConfig({
      sourceFilter: undefined,
    })

    const reporter = await MonocartReporter.create(config)
    const normalizedFilter = (reporter as any).createNormalizedSourceFilter()

    const result = normalizedFilter('src/component.ts')

    expect(result).toBe(true) // Should return true when no filter is defined
  })
})
