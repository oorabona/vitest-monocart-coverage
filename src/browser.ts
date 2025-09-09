/**
 * Browser provider entry point for Vitest custom provider module.
 * This is the actual module that Vitest loads in browser context.
 * It provides the interface expected by Vitest for browser coverage collection.
 *
 * Based on cenfun's vitest-monocart-coverage implementation.
 */

import { loggerFactory } from './logger.js'
import type { ScriptCoverageWithOffset } from './types.js'

const logger = loggerFactory.getModuleLogger(import.meta.url)

// Import browser runtime once at module level to avoid duplicate dynamic imports
const browserRuntimePromise = import('./browser-runtime.js')

// Simple function to dynamically load the provider
async function loadProvider() {
  logger.info('[browser] Loading provider for Node.js context')
  const { MonocartBrowserProvider } = await import('./browser-provider.js')
  return new MonocartBrowserProvider()
}

// Main browser interface that Vitest expects
export default {
  /**
   * Start coverage collection (load and initialize browser runtime)
   */
  async startCoverage(): Promise<void> {
    logger.info('[browser] startCoverage called')
    // Import and initialize browser runtime for proper coverage timing
    const browserRuntime = await browserRuntimePromise
    await browserRuntime.startCoverage()
  },

  /**
   * Take coverage snapshot from browser runtime
   */
  async takeCoverage(): Promise<{ result: ScriptCoverageWithOffset[] }> {
    logger.info('[browser] takeCoverage called')
    // Import browser runtime and collect coverage
    const browserRuntime = await browserRuntimePromise
    const coverageData = await browserRuntime.takeCoverage()
    /* v8 ignore start */
    logger.info(`[browser] Collected ${coverageData.length} coverage entries`)
    return { result: coverageData }
    /* v8 ignore stop */
  },

  /**
   * Stop coverage (no-op for browser mode)
   */
  stopCoverage(): void {
    logger.info('[browser] stopCoverage called (no-op)')
    // Browser mode should not stop coverage collection
  },

  /**
   * Get provider instance for Node.js context
   */
  getProvider() {
    logger.info('[browser] getProvider called')
    return loadProvider()
  },
}

// Also export named exports for compatibility
export { loadProvider }
export type { ScriptCoverageWithOffset } from './types.js'
