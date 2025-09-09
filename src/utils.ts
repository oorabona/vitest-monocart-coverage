/**
 * Utility functions for path manipulation and common operations
 * Extracted for reusability across modules
 */

import { normalize, relative } from 'node:path'
import type { Matcher, Result } from 'picomatch'

/**
 * Normalize a file path for consistent pattern matching
 * Converts backslashes to forward slashes for cross-platform compatibility
 */
export function normalizePath(filePath: string): string {
  return normalize(filePath).replace(/\\/g, '/')
}

/**
 * Convert a file path to a relative path from the current working directory
 * Handles absolute paths and ensures consistent cross-platform behavior
 */
export function toRelativePath(filePath: string, cwd = process.cwd()): string {
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
 * Check if any item in an array matches a given string using picomatch
 * Early returns the pattern matched on first match for performance
 */
export function findMatcher(array: Matcher[], stringToMatch: string): string | undefined {
  for (const matcher of array) {
    const result: Result = matcher(stringToMatch, true) as Result
    if (result.match) {
      return result.glob
    }
  }
  return undefined
}

/**
 * Deep merge configuration objects, with later objects taking precedence
 * Handles undefined and null values gracefully
 */
export function mergeConfigs<T extends Record<string, unknown>>(
  ...configs: (Partial<T> | undefined | null)[]
): T {
  const result = {} as T
  for (const config of configs) {
    if (config) {
      Object.assign(result, config)
    }
  }
  return result
}
