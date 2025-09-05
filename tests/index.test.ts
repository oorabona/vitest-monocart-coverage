import { describe, expect, it } from 'vitest'
import MonocartCoverageProviderModule, {
  MonocartCoverageProvider,
  MonocartReporter,
  MonocartCoverageProviderModule as NamedModule,
  resolveMonocartConfig,
} from '../src/index.js'

describe('index exports', () => {
  it('should export MonocartCoverageProvider', () => {
    expect(MonocartCoverageProvider).toBeDefined()
  })

  it('should export MonocartCoverageProviderModule', () => {
    expect(NamedModule).toBeDefined()
    expect(typeof NamedModule.getProvider).toBe('function')
  })

  it('should export MonocartReporter', () => {
    expect(MonocartReporter).toBeDefined()
  })

  it('should export resolveMonocartConfig', () => {
    expect(resolveMonocartConfig).toBeDefined()
    expect(typeof resolveMonocartConfig).toBe('function')
  })

  it('should have default export as MonocartCoverageProviderModule', () => {
    expect(MonocartCoverageProviderModule).toBe(NamedModule)
    expect(MonocartCoverageProviderModule.getProvider).toBeDefined()
  })
})
