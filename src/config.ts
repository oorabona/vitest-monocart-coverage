// Dynamic import for Node.js fs module to avoid bundling issues
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import picomatch from 'picomatch'
import type { Vitest } from 'vitest/node'
import { z } from 'zod'
import { loggerFactory } from './logger.js'
import type { MonocartCoverageOptions, RequiredMonocartCoverageOptions } from './types.js'
import { findMatcher, mergeConfigs, toRelativePath } from './utils.js'

// Module-level logger - deferred initialization
const logger = loggerFactory.getModuleLogger(import.meta.url)

/**
 * Detects if we're running in a browser environment
 */
function isBrowserEnvironment(): boolean {
  return typeof globalThis !== 'undefined' && 'window' in globalThis
}

/**
 * Validates CSS option usage based on environment context
 */
function validateCssOption(
  _config: RequiredMonocartCoverageOptions,
  customOptions: Partial<MonocartCoverageOptions>,
): void {
  // Only warn if CSS was explicitly enabled by the user (not just default false)
  if (!customOptions.css) {
    logger.debug('CSS option not explicitly set by user, skipping validation')
    return // No CSS option explicitly set by user, nothing to validate
  }

  const isBrowser = isBrowserEnvironment()
  logger.debug(`CSS validation: isBrowser=${isBrowser}, customOptions.css=${customOptions.css}`)

  if (isBrowser) {
    logger.debug('CSS coverage enabled in browser context')
  } else {
    logger.debug(
      'CSS coverage configuration detected in Node.js context. ' +
        'CSS will be handled by browser module during runtime.',
    )
    // Don't disable CSS here - let the browser module handle it
    // The provider runs in Node.js but the actual coverage runs in browser
  }
}

/**
 * Zod schema for validating external configuration
 * Focuses on external config files where we have no compile-time type safety
 */
const externalConfigSchema = z.looseObject({
  outputDir: z.string().optional(),
  reports: z.array(z.string()).optional(),
  sourceFilter: z.function().optional(),
  logging: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  css: z.boolean().optional(),
  name: z.string().optional(),
  lcov: z.boolean().optional(),
  sourcePath: z.string().optional(),
  cleanCache: z.boolean().optional(),
  onEnd: z.function().optional(),
}) // Allow additional properties

/**
 * Validates critical configuration properties using Zod
 */
function validateExternalConfig(config: unknown, source: string): void {
  if (!config || typeof config !== 'object') {
    return // Skip validation for falsy or non-object configs
  }

  try {
    externalConfigSchema.parse(config)
  } catch (error) {
    const zodError = error as z.ZodError
    const messages = zodError.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
    throw new Error(`Invalid configuration in ${source}: ${messages}`)
  }
}

const DEFAULT_CONFIG: RequiredMonocartCoverageOptions = {
  name: 'Vitest Monocart Coverage',
  outputDir: './coverage',
  reports: ['v8', 'console-details'],
  lcov: true,
  sourcePath: 'src',
  /* v8 ignore next */
  sourceFilter: () => true, // Default: include all files (will be overridden by Vitest patterns)
  cleanCache: true,
  logging: 'info',
  css: false,
  onEnd: () => {},
}

/**
 * Create a sourceFilter function from Vitest include/exclude patterns
 */
export function createSourceFilter(
  includePatterns: string[],
  excludePatterns: string[],
  cwd = process.cwd(),
): (sourcePath: string) => boolean {
  // Normalize patterns - remove leading ./ and ensure consistent format
  const normalizePattern = (pattern: string): string => {
    return pattern.replace(/^\.\//, '').replace(/\\/g, '/')
  }

  const normalizedInclude = includePatterns.map(normalizePattern)
  const normalizedExclude = excludePatterns.map(normalizePattern)

  // Create picomatch matchers
  const includeMatchers =
    normalizedInclude.length > 0 ? normalizedInclude.map(pattern => picomatch(pattern)) : []

  const excludeMatchers =
    normalizedExclude.length > 0 ? normalizedExclude.map(pattern => picomatch(pattern)) : []

  return (sourcePath: string): boolean => {
    // Convert to relative path for consistent matching
    const relativePath = toRelativePath(sourcePath, cwd)

    logger.debug(`sourceFilter called for "${sourcePath}" -> "${relativePath}"`)

    // Apply exclude patterns first - if any exclude pattern matches, exclude the file
    const excludedPattern = findMatcher(excludeMatchers, relativePath)
    if (excludedPattern) {
      logger.debug(`sourceFilter EXCLUDED "${relativePath}" by exclude pattern: ${excludedPattern}`)
      return false
    }

    // If we have include patterns, file must match at least one
    if (includeMatchers.length > 0) {
      const includedPattern = findMatcher(includeMatchers, relativePath)
      if (includedPattern) {
        logger.debug(
          `sourceFilter INCLUDED "${relativePath}" by include pattern: ${includedPattern}`,
        )
        return true
      } else {
        logger.debug(`sourceFilter REJECTED "${relativePath}" (no include patterns matched)`)
        return false
      }
    }

    // If no include patterns are specified, default to include (unless excluded above)
    logger.debug(`sourceFilter INCLUDED "${relativePath}" by default (no include patterns)`)
    return true
  }
}

/**
 * Type definition for config loaders
 */
type ConfigLoader = (configPath: string) => Promise<unknown>

/**
 * Map of file patterns to their corresponding loaders
 */
const configLoaders = new Map<RegExp, ConfigLoader>([
  // JSON files
  [
    /\.json$/,
    async configPath => {
      const loaded = await import(/* @vite-ignore */ pathToFileURL(configPath).href, {
        with: { type: 'json' },
      })
      return loaded?.default || loaded
    },
  ],

  // CommonJS files
  [
    /\.cjs$/,
    async configPath => {
      const { createRequire } = await import('node:module')
      const req = createRequire(import.meta.url)
      const loaded = req(configPath)
      /* v8 ignore next - Fallback if default export is missing */
      return loaded?.default || loaded
    },
  ],

  // ES Module files (.js, .mjs)
  [
    /\.m?js$/,
    async configPath => {
      const loaded = await import(/* @vite-ignore */ pathToFileURL(configPath).href)
      return loaded?.default || loaded
    },
  ],

  // TypeScript files
  [
    /\.ts$/,
    async configPath => {
      // First try native ESM import (may work if the host has a loader)
      try {
        const mod = await import(/* @vite-ignore */ pathToFileURL(configPath).href)
        /* v8 ignore next - Fallback if default export is missing */
        return mod?.default || mod
      } catch {
        // Then try vite-node/register like Vitest
        try {
          const { createRequire } = await import('node:module')
          const req = createRequire(import.meta.url)
          req('vite-node/register')
          const mod = await import(/* @vite-ignore */ pathToFileURL(configPath).href)
          /* v8 ignore next - Fallback if default export is missing */
          return mod?.default || mod
        } catch (err) {
          logger.warn(`Failed to load TS config via vite-node: ${err}`)
          return null
        }
      }
    },
  ],
])

/**
 * Find the appropriate loader for a config file
 */
function findConfigLoader(configFile: string): ConfigLoader {
  const entry = Array.from(configLoaders).find(([pattern]) => pattern.test(configFile))
  /* v8 ignore next 3 - Should not happen due to prior existence check */
  if (!entry) {
    throw new Error(`No config loader found for file: ${configFile}`)
  }
  return entry[1]
}

/**
 * Extract configuration overrides from Vitest context
 */
function extractVitestOverrides(
  vitestCtx: Vitest,
  cwd: string,
): Partial<RequiredMonocartCoverageOptions> {
  const overrides: Partial<RequiredMonocartCoverageOptions> = {}

  // Basic property mappings
  const coverage = vitestCtx.config.coverage
  if (coverage.reportsDirectory) {
    overrides.outputDir = coverage.reportsDirectory
  }
  if (coverage.clean !== undefined) {
    overrides.cleanCache = coverage.clean
  }
  if (vitestCtx.config.name) {
    overrides.name = `${vitestCtx.config.name} Coverage`
  }

  // Handle include/exclude patterns
  const includePatterns: string[] = 'include' in coverage ? coverage.include || [] : []
  const excludePatterns: string[] = 'exclude' in coverage ? coverage.exclude || [] : []

  if (includePatterns.length > 0) {
    // Map Vitest include patterns to Monocart sourcePath (first pattern)
    const firstPattern = includePatterns[0]
    if (firstPattern) {
      overrides.sourcePath = firstPattern.replace(/\/\*\*\/\*$/, '')
    }
  }

  // Create sourceFilter from Vitest patterns
  if (includePatterns.length > 0 || excludePatterns.length > 0) {
    overrides.sourceFilter = createSourceFilter(includePatterns, excludePatterns, cwd)

    logger.info(
      `Created sourceFilter from Vitest patterns - include: ${includePatterns.join(', ')}, exclude: ${excludePatterns.join(', ')}`,
    )
  }

  return overrides
}

// Async resolver with dynamic import support for JS/MJS/CJS/TS/JSON
export async function resolveMonocartConfig(
  customOptions?: MonocartCoverageOptions,
  vitestCtx?: Vitest,
  cwd = process.cwd(),
): Promise<RequiredMonocartCoverageOptions> {
  let config = { ...DEFAULT_CONFIG }

  const configFiles = [
    'monocart.config.mjs',
    'monocart.config.js',
    'monocart.config.cjs',
    'monocart.config.ts',
    'monocart.config.json',
  ]

  for (const configFile of configFiles) {
    const configPath = join(cwd, configFile)
    try {
      const fsModule = 'node:fs'
      const { existsSync } = await import(/* @vite-ignore */ fsModule)
      if (!existsSync(configPath)) {
        continue
      }
      /* v8 ignore start */
    } catch (_importError) {
      // Fallback: skip if fs import fails (shouldn't happen in Node.js context)
      continue
    }
    /* v8 ignore stop */

    const loader = findConfigLoader(configFile)

    try {
      const loadedConfig = await loader(configPath)

      if (loadedConfig) {
        validateExternalConfig(loadedConfig, configFile)
        config = { ...config, ...(loadedConfig as Record<string, unknown>) }
        break
      }
    } catch (error) {
      // Re-throw validation errors so they're not swallowed
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw error
      }
      logger.warn(`Failed to load config from ${configPath}: ${error}`)
    }
  }

  // Extract Vitest configuration overrides
  const vitestOverrides = vitestCtx ? extractVitestOverrides(vitestCtx, cwd) : {}

  // Merge all configurations with proper precedence
  config = mergeConfigs(config, vitestOverrides, customOptions)

  // Validate CSS option based on environment
  validateCssOption(config, customOptions || {})

  // Update logger factory with the resolved logging level
  loggerFactory.setLevel(config.logging)

  return config
}
