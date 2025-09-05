// import path from 'node:path'
import type { ViteUserConfig } from 'vitest/config'
import type {
  MonocartCoverageOptions,
  ResolvedMonocartCoverageOptions,
  ResolvedMonocartVitestConfig,
} from './types.js'

/**
 * Minimal, non-opinionated defaults for Monocart coverage
 */
const MINIMAL_DEFAULTS = {
  outputDir: './coverage',
  reports: ['v8'], // Single default report instead of multiple
  logging: 'info',
} as const

/**
 * Helper function to create coverage configuration with minimal defaults
 * @param customOptions - User-provided Monocart options
 * @param vitestDefaults - Optional Vitest coverage defaults to preserve
 * @returns Resolved coverage configuration
 */
function createCoverageConfig(
  customOptions: Partial<MonocartCoverageOptions> = {},
  vitestDefaults?: Partial<ResolvedMonocartCoverageOptions>,
): ResolvedMonocartCoverageOptions {
  const customProviderModule = '@oorabona/vitest-monocart-coverage'

  return {
    // Required provider configuration
    provider: 'custom',
    customProviderModule,

    // Use Vitest defaults if provided, otherwise minimal defaults
    enabled: vitestDefaults?.enabled ?? true,
    clean: vitestDefaults?.clean ?? true,

    // Preserve include/exclude from Vitest defaults, or use minimal defaults
    include: vitestDefaults?.include ?? ['src/**/*'],
    exclude: vitestDefaults?.exclude ?? [
      'node_modules/',
      'scripts/',
      'dist/',
      'tests/',
      '*.config.*',
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*',
    ],

    // Preserve all Vitest coverage options if they exist
    ...(vitestDefaults?.extension && { extension: vitestDefaults.extension }),
    ...(vitestDefaults?.all !== undefined && { all: vitestDefaults.all }),
    ...(vitestDefaults?.cleanOnRerun !== undefined && {
      cleanOnRerun: vitestDefaults.cleanOnRerun,
    }),
    ...(vitestDefaults?.thresholds && { thresholds: vitestDefaults.thresholds }),
    ...(vitestDefaults?.reportOnFailure !== undefined && {
      reportOnFailure: vitestDefaults.reportOnFailure,
    }),
    ...(vitestDefaults?.allowExternal !== undefined && {
      allowExternal: vitestDefaults.allowExternal,
    }),
    ...(vitestDefaults?.processingConcurrency && {
      processingConcurrency: vitestDefaults.processingConcurrency,
    }),

    reporter: vitestDefaults?.reporter ?? [],

    // Merge custom options with minimal defaults
    customOptions: {
      ...MINIMAL_DEFAULTS,
      ...customOptions,
    },
  } as unknown as ResolvedMonocartCoverageOptions
}

/**
 * Type guard to determine if an argument is a Vite configuration object
 * @param arg - The argument to check
 * @returns True if the argument appears to be a Vite config
 */
function isViteConfig(arg: unknown): arg is ViteUserConfig {
  if (!arg || typeof arg !== 'object') {
    return false
  }

  const obj = arg as Record<string, unknown>
  // Check for common Vite configuration properties
  return 'test' in obj || 'plugins' in obj || 'build' in obj || 'server' in obj
}

/**
 * Helper function to configure Vitest with Monocart coverage provider
 *
 * This is the recommended approach for using Monocart coverage with Vitest.
 * It uses the provider mode which processes coverage data directly in memory
 * without requiring intermediate JSON files.
 *
 * @param config - Base Vitest configuration
 * @param options - Monocart provider configuration options
 * @returns Enhanced Vitest configuration with Monocart provider
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vitest/config'
 * import { withMonocartProvider } from '@oorabona/vitest-monocart-coverage'
 *
 * export default withMonocartProvider(
 *   defineConfig({
 *     test: {
 *       // your test config
 *     }
 *   }),
 *   {
 *     coverage: {
 *       customOptions: {
 *         outputDir: './coverage-reports',
 *         reports: ['html', 'console-details', 'lcov'],
 *         name: 'My Project Coverage'
 *       }
 *     }
 *   }
 * )
 * ```
 */
// // Internal helper to determine the correct custom provider module specifier.
// // - In consumers: use the package name so Vitest resolves from node_modules.
// // - In this repo (self-coverage): point to built dist file.
// function resolveProviderModuleSpecifier(preferPackageName = false): string {
//   // Heuristic: when this file runs from src during self-coverage, prefer local dist path
//   const isRunningFromSrc = import.meta.url.includes('/src/')
//   if (!preferPackageName && isRunningFromSrc) {
//     return path.resolve(process.cwd(), 'dist/index.js')
//   }
//   // Default for consumers
//   return '@oorabona/vitest-monocart-coverage'
// }

// Overloads to support both usages
export function withMonocartProvider(
  options?: Partial<MonocartCoverageOptions>,
): ResolvedMonocartCoverageOptions
export function withMonocartProvider(
  config: ViteUserConfig,
  options?: Partial<MonocartCoverageOptions>,
): ResolvedMonocartVitestConfig
export function withMonocartProvider(
  arg1?: ViteUserConfig | Partial<MonocartCoverageOptions>,
  arg2: Partial<MonocartCoverageOptions> = {},
): ResolvedMonocartCoverageOptions | ResolvedMonocartVitestConfig {
  // Coverage-only mode: withMonocartProvider({ ...customOptions })
  if (!isViteConfig(arg1)) {
    const customOptions = (arg1 || {}) as Partial<MonocartCoverageOptions>
    return createCoverageConfig(customOptions)
  }

  // Full-config mode: withMonocartProvider(defineConfig({...}), { ...customOptions })
  const baseConfig = arg1
  const customOptions = arg2

  const existingTest = baseConfig.test ?? {}
  const existingCoverage = existingTest.coverage ?? {}

  // Extract existing custom options safely (they may not exist if not using our provider)
  const existingCustomOptions = (existingCoverage as any)?.customOptions ?? {}

  // Create coverage config with existing Vitest defaults preserved
  const mergedCoverage = createCoverageConfig(
    {
      ...existingCustomOptions,
      ...customOptions,
    },
    existingCoverage as Partial<ResolvedMonocartCoverageOptions>,
  )

  const nextConfig: ResolvedMonocartVitestConfig = {
    ...baseConfig,
    test: {
      ...existingTest,
      coverage: mergedCoverage,
    },
  } as ResolvedMonocartVitestConfig

  return nextConfig
}

/**
 * Direct configuration helper for simple cases
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vitest/config'
 * import { createMonocartConfig } from '@oorabona/vitest-monocart-coverage'
 *
 * export default defineConfig({
 *   test: {
 *     coverage: createMonocartConfig({
 *       outputDir: './my-coverage',
 *       reports: ['html']
 *     })
 *   }
 * })
 * ```
 */
export function createMonocartConfig(
  options: Partial<MonocartCoverageOptions> = {},
): ResolvedMonocartCoverageOptions {
  return createCoverageConfig(options)
}
