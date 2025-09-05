/**
 * @fileoverview
 * Vitest-Monocart Coverage Provider
 *
 * This library integrates Vitest's V8 coverage engine with Monocart coverage
 * reporting for enhanced visualization and features.
 *
 * @example
 * ```typescript
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config'
 * import { withMonocartProvider } from '@oorabana/vitest-monocart-coverage'
 *
 * export default defineConfig({
 *   test: {
 *     coverage: withMonocartProvider({
 *       reports: ['v8', 'console', 'html']
 *     })
 *   }
 * })
 * ```
 */

import { MonocartCoverageProviderModule } from './provider.js'

export { resolveMonocartConfig } from './config.js'
export { MonocartCoverageProvider, MonocartCoverageProviderModule } from './provider.js'
// Core provider API
export { createMonocartConfig, withMonocartProvider } from './provider-config.js'
// Core components and utilities
export { MonocartReporter } from './reporter.js'
// TypeScript types
export type { CoverageData, MonocartCoverageOptions, MonocartProviderConfig } from './types.js'

// Default export for Vitest custom provider usage
export default MonocartCoverageProviderModule
