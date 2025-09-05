import type { Profiler } from 'node:inspector/promises'
import type { ViteUserConfig } from 'vitest/dist/config.js'
import type { ResolvedCoverageOptions } from 'vitest/node'

/**
 * Configuration options for the Monocart coverage provider.
 * These options are passed to the underlying monocart-coverage-reports library.
 */
export interface MonocartCoverageOptions {
  /** Name displayed in coverage reports */
  name?: string
  /** Directory where coverage reports will be generated */
  outputDir?: string
  /** Array of report formats to generate (e.g., ['v8', 'console', 'html']) */
  reports?: string[]
  /** Generate LCOV report format */
  lcov?: boolean
  /** Source path mapping for coverage reports */
  sourcePath?: string
  /** Filter function to include/exclude files from coverage */
  sourceFilter?: (sourcePath: string) => boolean
  /** Clean the cache before generating reports */
  cleanCache?: boolean
  /** Logging level for coverage processing */
  logging?: 'debug' | 'info' | 'warn' | 'error'
  /** Enable CSS coverage collection (requires supported environment) */
  css?: boolean
  /** Callback executed after coverage generation */
  onEnd?: (coverageResults: unknown) => void | Promise<void>
}

/**
 * Custom coverage options for the Monocart provider that properly extend Vitest's type system.
 * This interface ensures type safety when using the 'custom' provider with Monocart.
 */
// export interface MonocartCoverageOptions {
//   provider: 'custom'
//   customProviderModule: string
//   customOptions?: Partial<MonocartConfig>
//   // Standard Vitest coverage options
//   enabled?: boolean
//   include?: string[]
//   exclude?: string[]
//   clean?: boolean
//   cleanOnRerun?: boolean
//   reportsDirectory?: string
//   all?: boolean
//   extension?: string | string[]
//   thresholds?: {
//     branches?: number
//     functions?: number
//     lines?: number
//     statements?: number
//     100?: boolean
//     perFile?: boolean
//     autoUpdate?: boolean
//   }
//   reportOnFailure?: boolean
//   allowExternal?: boolean
//   processingConcurrency?: number
// }

/**
 * Resolved coverage options for the Monocart provider with all required fields populated.
 * Since we use V8 internally, we extend the V8 resolved options and add our custom config.
 */
export interface ResolvedMonocartCoverageOptions extends ResolvedCoverageOptions<'v8'> {
  customOptions?: RequiredMonocartCoverageOptions
}

export interface ResolvedMonocartVitestConfig extends ViteUserConfig {
  test: {
    coverage: ResolvedMonocartCoverageOptions
  }
}

/**
 * Standardized coverage data format for internal processing.
 */
export interface CoverageData {
  url: string
  source: string
  functions: Array<{
    functionName: string
    ranges: Array<{
      startOffset: number
      endOffset: number
      count: number
    }>
    isBlockCoverage: boolean
  }>
}

/**
 * Configuration structure for withMonocartProvider helper function.
 * This represents the shape of options passed to configure a Vitest project with Monocart coverage.
 */
export interface MonocartProviderConfig {
  /** Coverage provider configuration */
  coverage?: Partial<MonocartCoverageOptions>
}

export type RequiredMonocartCoverageOptions = Required<MonocartCoverageOptions>

// ScriptCoverageWithOffset is not exported by Vitest, so we define a minimal version here
export interface ScriptCoverageWithOffset extends Profiler.ScriptCoverage {
  startOffset?: number
  endOffset?: number
  scriptOffset?: number
}
