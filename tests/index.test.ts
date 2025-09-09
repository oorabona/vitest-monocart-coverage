import { describe, expect, it } from 'vitest'
import MonocartCoverageProviderModule, {
  MonocartCoverageProvider,
  MonocartReporter,
  MonocartCoverageProviderModule as NamedModule,
  resolveMonocartConfig,
  shouldLogAtLevel,
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

  it('should export shouldLogAtLevel', () => {
    expect(shouldLogAtLevel).toBeDefined()
    expect(typeof shouldLogAtLevel).toBe('function')
  })

  it('should have default export as MonocartCoverageProviderModule', () => {
    expect(MonocartCoverageProviderModule).toBe(NamedModule)
    expect(MonocartCoverageProviderModule.getProvider).toBeDefined()
  })
})

describe('shouldLogAtLevel', () => {
  it('should return false when currentLevel is undefined', () => {
    expect(shouldLogAtLevel(undefined, 'debug')).toBe(false)
    expect(shouldLogAtLevel(undefined, 'info')).toBe(false)
    expect(shouldLogAtLevel(undefined, 'warn')).toBe(false)
    expect(shouldLogAtLevel(undefined, 'error')).toBe(false)
  })

  it('should return true when targetLevel is higher or equal than currentLevel', () => {
    expect(shouldLogAtLevel('debug', 'debug')).toBe(true)
    expect(shouldLogAtLevel('debug', 'info')).toBe(true)
    expect(shouldLogAtLevel('debug', 'warn')).toBe(true)
    expect(shouldLogAtLevel('debug', 'error')).toBe(true)

    expect(shouldLogAtLevel('info', 'info')).toBe(true)
    expect(shouldLogAtLevel('info', 'warn')).toBe(true)
    expect(shouldLogAtLevel('info', 'error')).toBe(true)

    expect(shouldLogAtLevel('warn', 'warn')).toBe(true)
    expect(shouldLogAtLevel('warn', 'error')).toBe(true)

    expect(shouldLogAtLevel('error', 'error')).toBe(true)
  })

  it('should return false when targetLevel is lower than currentLevel', () => {
    expect(shouldLogAtLevel('info', 'debug')).toBe(false)
    expect(shouldLogAtLevel('warn', 'debug')).toBe(false)
    expect(shouldLogAtLevel('warn', 'info')).toBe(false)
    expect(shouldLogAtLevel('error', 'debug')).toBe(false)
    expect(shouldLogAtLevel('error', 'info')).toBe(false)
    expect(shouldLogAtLevel('error', 'warn')).toBe(false)
  })
})
