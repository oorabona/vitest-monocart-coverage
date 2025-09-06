import { describe, expect, it } from 'vitest'

// Import all exports to ensure they're covered
import {
  createMonocartConfig,
  MonocartCoverageProvider,
  MonocartCoverageProviderModule,
  MonocartReporter,
  resolveMonocartConfig,
  withMonocartProvider,
} from '../src/index.js'

describe('Full module coverage', () => {
  it('should export all main functions', () => {
    expect(withMonocartProvider).toBeDefined()
    expect(createMonocartConfig).toBeDefined()
    expect(MonocartCoverageProvider).toBeDefined()
    expect(MonocartCoverageProviderModule).toBeDefined()
    expect(MonocartReporter).toBeDefined()
    expect(resolveMonocartConfig).toBeDefined()
  })

  it('should create a MonocartCoverageProvider instance', () => {
    const provider = new MonocartCoverageProvider()
    expect(provider).toBeInstanceOf(MonocartCoverageProvider)
    expect(provider.name).toBe('v8')
  })

  it('should create coverage map', () => {
    const provider = new MonocartCoverageProvider()
    const map = provider.createCoverageMap()
    expect(map).toBeDefined()
  })

  it('should create provider from module', () => {
    const provider = MonocartCoverageProviderModule.getProvider()
    expect(provider).toBeInstanceOf(MonocartCoverageProvider)
  })

  it('should handle takeCoverage', () => {
    // @ts-expect-error - takeCoverage is available on custom provider
    const result = MonocartCoverageProviderModule.takeCoverage()
    expect(result).toEqual({})
  })

  it('should create monocart config', () => {
    const config = createMonocartConfig({
      outputDir: './test-coverage',
      reports: ['html'],
    })

    expect(config.provider).toBe('custom')
    // @ts-expect-error - customProviderModule exists on resolved config
    expect(config.customProviderModule).toBe('@oorabona/vitest-monocart-coverage')
    // @ts-expect-error - customOptions exists on resolved config
    expect(config.customOptions.outputDir).toBe('./test-coverage')
    // @ts-expect-error - customOptions exists on resolved config
    expect(config.customOptions.reports).toContain('html')
  })
})
