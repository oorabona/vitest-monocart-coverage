import { existsSync } from 'node:fs'
import { join, normalize, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import picomatch from 'picomatch'
import type { Vitest } from 'vitest/node'
import { createLogger } from './logger.js'
import type { MonocartCoverageOptions, RequiredMonocartCoverageOptions } from './types.js'

/**
 * Validates critical configuration properties that could cause runtime failures
 * Focuses on external config files where we have no compile-time type safety
 */
function validateExternalConfig(config: unknown, source: string): void {
  if (!config || typeof config !== 'object') {
    return // Skip validation for falsy or non-object configs
  }

  const cfg = config as Record<string, unknown>

  // Validate outputDir - must be string if provided
  if (cfg['outputDir'] !== undefined && typeof cfg['outputDir'] !== 'string') {
    throw new Error(
      `Invalid outputDir in ${source}: expected string, got ${typeof cfg['outputDir']}`,
    )
  }

  // Validate reports - must be array if provided
  if (cfg['reports'] !== undefined && !Array.isArray(cfg['reports'])) {
    throw new Error(`Invalid reports in ${source}: expected array, got ${typeof cfg['reports']}`)
  }

  // Validate sourceFilter - must be function if provided
  if (cfg['sourceFilter'] !== undefined && typeof cfg['sourceFilter'] !== 'function') {
    throw new Error(
      `Invalid sourceFilter in ${source}: expected function, got ${typeof cfg['sourceFilter']}`,
    )
  }

  // Validate logging - must be valid level if provided
  if (cfg['logging'] !== undefined) {
    const validLevels = ['debug', 'info', 'warn', 'error']
    if (typeof cfg['logging'] !== 'string' || !validLevels.includes(cfg['logging'])) {
      throw new Error(
        `Invalid logging in ${source}: expected one of ${validLevels.join(', ')}, got ${cfg['logging']}`,
      )
    }
  }

  // Validate onEnd - must be function if provided
  if (cfg['onEnd'] !== undefined && typeof cfg['onEnd'] !== 'function') {
    throw new Error(`Invalid onEnd in ${source}: expected function, got ${typeof cfg['onEnd']}`)
  }
}

const DEFAULT_CONFIG: RequiredMonocartCoverageOptions = {
  name: 'Vitest Monocart Coverage',
  outputDir: './coverage',
  reports: ['v8', 'console-details'],
  lcov: true,
  sourcePath: 'src',
  /* v8 ignore next - Default sourceFilter is always overridden during config resolution */
  sourceFilter: () => true,
  cleanCache: true,
  logging: 'info',
  css: true,
  onEnd: () => {},
}

/**
 * Normalize a file path for consistent pattern matching
 */
function normalizePath(filePath: string): string {
  return normalize(filePath).replace(/\\/g, '/')
}

/**
 * Convert a file path to a relative path from the current working directory
 */
function toRelativePath(filePath: string, cwd = process.cwd()): string {
  const normalized = normalizePath(filePath)
  const cwdNormalized = normalizePath(cwd)

  if (normalized.startsWith(cwdNormalized)) {
    return normalized.slice(cwdNormalized.length + 1)
  }

  // Try using Node's relative function
  const rel = relative(cwd, filePath)
  return normalizePath(rel)
}

/**
 * Create a sourceFilter function from Vitest include/exclude patterns
 */
export function createSourceFilter(
  includePatterns: string[] = [],
  excludePatterns: string[] = [],
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

    // Apply exclude patterns first - if any exclude pattern matches, exclude the file
    for (const excludeMatcher of excludeMatchers) {
      if (excludeMatcher(relativePath)) {
        return false
      }
    }

    // If we have include patterns, file must match at least one
    if (includeMatchers.length > 0) {
      return includeMatchers.some(includeMatcher => includeMatcher(relativePath))
    }

    // If no include patterns are specified, default to include (unless excluded above)
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
      const loaded = await import(pathToFileURL(configPath).href, { with: { type: 'json' } })
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
      return loaded?.default || loaded
    },
  ],

  // ES Module files (.js, .mjs)
  [
    /\.m?js$/,
    async configPath => {
      const loaded = await import(pathToFileURL(configPath).href)
      return loaded?.default || loaded
    },
  ],

  // TypeScript files
  [
    /\.ts$/,
    async configPath => {
      // First try native ESM import (may work if the host has a loader)
      try {
        const mod = await import(pathToFileURL(configPath).href)
        /* v8 ignore next - Fallback if default export is missing */
        return mod?.default || mod
      } catch {
        // Then try vite-node/register like Vitest
        try {
          const { createRequire } = await import('node:module')
          const req = createRequire(import.meta.url)
          req('vite-node/register')
          const mod = await import(pathToFileURL(configPath).href)
          /* v8 ignore next - Fallback if default export is missing */
          return mod?.default || mod
        } catch (err) {
          console.warn(`Failed to load TS config via vite-node:`, err)
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
  for (const [pattern, loader] of configLoaders) {
    if (pattern.test(configFile)) {
      return loader
    }
  }
  /* v8 ignore next - Edge case where no loader is found */
  return (_: string) => {
    throw new Error(`No loader found for config file: ${configFile}`)
  }
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
    if (!existsSync(configPath)) {
      continue
    }

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
      console.warn(`Failed to load config from ${configPath}:`, error)
    }
  }

  // Apply Vitest-based configuration if available
  if (vitestCtx) {
    if (vitestCtx.config.coverage.reportsDirectory) {
      config.outputDir = vitestCtx.config.coverage.reportsDirectory
    }
    if (vitestCtx.config.coverage.clean !== undefined) {
      config.cleanCache = vitestCtx.config.coverage.clean
    }
    if (vitestCtx.config.name) {
      config.name = `${vitestCtx.config.name} Coverage`
    }

    // Inherit include/exclude configurations from Vitest coverage
    const coverage = vitestCtx.config.coverage
    const includePatterns: string[] = 'include' in coverage ? coverage.include || [] : []
    const excludePatterns: string[] = 'exclude' in coverage ? coverage.exclude || [] : []

    if (includePatterns.length > 0) {
      // Map Vitest include patterns to Monocart sourcePath (first pattern)
      /* v8 ignore next - Edge case where first pattern is undefined, fallback to empty string */
      config.sourcePath = includePatterns[0]?.replace(/\/\*\*\/\*$/, '') ?? ''
    }

    // Create sourceFilter from Vitest patterns
    if (includePatterns.length > 0 || excludePatterns.length > 0) {
      config.sourceFilter = createSourceFilter(includePatterns, excludePatterns, cwd)

      const logger = createLogger(config.logging)
      logger.info(
        `[monocart] Created sourceFilter from Vitest patterns - include: ${includePatterns.join(', ')}, exclude: ${excludePatterns.join(', ')}`,
      )
    }
  }

  if (customOptions) {
    config = { ...config, ...customOptions }
  }

  return config
}
