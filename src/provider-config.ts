// import path from 'node:path'
import type { ViteUserConfig } from 'vitest/config'
import { loggerFactory } from './logger.js'
import type {
  MonocartBrowserCoverageOptions,
  MonocartCoverageOptions,
  ResolvedMonocartBrowserCoverageOptions,
  ResolvedMonocartBrowserVitestConfig,
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
 * Browser-specific defaults for Monocart coverage
 */
const MINIMAL_BROWSER_DEFAULTS = {
  outputDir: './coverage-browser',
  reports: ['console-details', 'html'],
  logging: 'info',
  css: false, // Disabled by default, must be explicitly enabled
} as const

const logger = loggerFactory.getModuleLogger(import.meta.url)

/**
 * Helper function to preserve Vitest coverage options
 */
function preserveVitestOptions(vitestDefaults?: any) {
  if (!vitestDefaults) {
    return {}
  }

  return {
    ...(vitestDefaults.extension && { extension: vitestDefaults.extension }),
    ...(vitestDefaults.all !== undefined && { all: vitestDefaults.all }),
    ...(vitestDefaults.cleanOnRerun !== undefined && {
      cleanOnRerun: vitestDefaults.cleanOnRerun,
    }),
    ...(vitestDefaults.thresholds && { thresholds: vitestDefaults.thresholds }),
    ...(vitestDefaults.reportOnFailure !== undefined && {
      reportOnFailure: vitestDefaults.reportOnFailure,
    }),
    ...(vitestDefaults.allowExternal !== undefined && {
      allowExternal: vitestDefaults.allowExternal,
    }),
    ...(vitestDefaults.processingConcurrency && {
      processingConcurrency: vitestDefaults.processingConcurrency,
    }),
  }
}

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

  const baseConfig = {
    // Required provider configuration
    provider: 'custom',
    customProviderModule,

    // Use Vitest defaults if provided, but don't force enabled: true
    // Let Vitest handle the enabled state naturally
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
      'anonymous*.js', // Exclude Vitest browser runtime internals
    ],

    reporter: vitestDefaults?.reporter ?? [],

    // Merge custom options with minimal defaults
    customOptions: {
      ...MINIMAL_DEFAULTS,
      ...customOptions,
    },
  }

  return {
    ...baseConfig,
    ...preserveVitestOptions(vitestDefaults),
  } as unknown as ResolvedMonocartCoverageOptions
}

/**
 * Helper function to create browser-specific coverage configuration
 * @param customOptions - User-provided Monocart browser options
 * @param vitestDefaults - Optional Vitest coverage defaults to preserve
 * @returns Resolved browser coverage configuration
 */
function createBrowserCoverageConfig(
  customOptions: Partial<MonocartBrowserCoverageOptions> = {},
  vitestDefaults: Partial<ResolvedMonocartBrowserCoverageOptions>,
): ResolvedMonocartBrowserCoverageOptions {
  const customProviderModule = '@oorabona/vitest-monocart-coverage/browser'

  // CSS configuration is passed directly through customOptions
  // No need for temporary file - it's handled by the browser module directly
  const cssEnabled = customOptions.css ?? MINIMAL_BROWSER_DEFAULTS.css
  logger.info(`[monocart] Browser CSS coverage: ${cssEnabled ? 'enabled' : 'disabled'}`)

  const baseConfig = {
    // Required provider configuration
    provider: 'custom',
    customProviderModule,

    // Don't set enabled: true explicitly - it causes loading issues in browser mode
    // Let Vitest handle the enabled state naturally through CLI flags
    clean: vitestDefaults.clean ?? true,

    // Preserve include/exclude from Vitest defaults, or use minimal defaults
    include: vitestDefaults.include,

    // add anonymous*.js to exclude list to filter Vitest browser internals
    exclude: vitestDefaults.exclude
      ? Array.isArray(vitestDefaults.exclude)
        ? [...vitestDefaults.exclude, 'anonymous*.js']
        : [vitestDefaults.exclude, 'anonymous*.js']
      : ['anonymous*.js'],

    reporter: vitestDefaults.reporter ?? [],

    // Merge custom options with browser-specific defaults
    customOptions: {
      ...MINIMAL_BROWSER_DEFAULTS,
      ...customOptions,
    },
  }

  /* v8 ignore start - Edge case properties rarely used */
  const preservedOptions = preserveVitestOptions(vitestDefaults)
  /* v8 ignore stop */

  return { ...baseConfig, ...preservedOptions } as unknown as ResolvedMonocartBrowserCoverageOptions
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

/**
 * Helper function to configure Vitest with Monocart browser coverage provider
 *
 * This is specifically designed for browser environments using Chrome DevTools Protocol.
 * It provides optimized defaults for browser testing and supports CSS coverage collection.
 *
 * @param config - Base Vitest configuration
 * @param options - Monocart browser provider configuration options
 * @returns Enhanced Vitest configuration with Monocart browser provider
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vitest/config'
 * import { withMonocartBrowserProvider } from '@oorabona/vitest-monocart-coverage'
 *
 * export default withMonocartBrowserProvider(
 *   defineConfig({
 *     test: {
 *       browser: {
 *         enabled: true,
 *         instances: [{ browser: 'chromium' }]
 *       }
 *     }
 *   }),
 *   {
 *     css: true, // Enable CSS coverage
 *     outputDir: './coverage-browser',
 *     reports: ['html', 'console-details']
 *   }
 * )
 * ```
 */
// Overloads to support both usages
export function withMonocartBrowserProvider(
  options?: Partial<MonocartBrowserCoverageOptions>,
): ResolvedMonocartBrowserCoverageOptions
export function withMonocartBrowserProvider(
  config: ViteUserConfig,
  options?: Partial<MonocartBrowserCoverageOptions>,
): ResolvedMonocartBrowserVitestConfig
export function withMonocartBrowserProvider(
  arg1?: ViteUserConfig | Partial<MonocartBrowserCoverageOptions>,
  arg2: Partial<MonocartBrowserCoverageOptions> = {},
): ResolvedMonocartBrowserCoverageOptions | ResolvedMonocartBrowserVitestConfig {
  // Coverage-only mode: withMonocartBrowserProvider({ ...customOptions })
  if (!isViteConfig(arg1)) {
    const customOptions = (arg1 || {}) as Partial<MonocartBrowserCoverageOptions>
    return createBrowserCoverageConfig(
      customOptions,
      {} as Partial<ResolvedMonocartBrowserCoverageOptions>,
    )
  }

  // Full-config mode: withMonocartBrowserProvider(defineConfig({...}), { ...customOptions })
  const baseConfig = arg1
  const customOptions = arg2

  const existingTest = baseConfig.test ?? {}
  const existingCoverage = existingTest.coverage ?? {}

  // Extract existing custom options safely (they may not exist if not using our provider)
  const existingCustomOptions = (existingCoverage as any)?.customOptions ?? {}

  // Create browser coverage config with existing Vitest defaults preserved
  const mergedCoverage = createBrowserCoverageConfig(
    {
      ...existingCustomOptions,
      ...customOptions,
    },
    existingCoverage as Partial<ResolvedMonocartBrowserCoverageOptions>,
  )

  const nextConfig: ResolvedMonocartBrowserVitestConfig = {
    ...baseConfig,
    test: {
      ...existingTest,
      coverage: mergedCoverage,
    },
  } as ResolvedMonocartBrowserVitestConfig

  return nextConfig
}
