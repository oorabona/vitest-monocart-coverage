/**
 * Browser entry point for Vitest Monocart Coverage
 *
 * Use this entry point when running tests in browser mode:
 *
 * ```js
 * // vitest.config.ts
 * export default defineConfig({
 *   test: {
 *     browser: {
 *       enabled: true,
 *       provider: 'playwright', // or 'webdriverio'
 *       instances: [{ browser: 'chromium' }]
 *     },
 *     coverage: {
 *       provider: 'custom',
 *       customProviderModule: '@oorabana/vitest-monocart-coverage/browser',
 *       customOptions: {
 *         css: true, // Enable CSS coverage in browser mode
 *         reports: ['html', 'console-details', 'lcov']
 *       }
 *     }
 *   }
 * })
 * ```
 */

export { MonocartBrowserProvider, MonocartBrowserProviderModule } from './browser-provider.js'
export { withMonocartProvider } from './provider-config.js'
export type { MonocartCoverageOptions, RequiredMonocartCoverageOptions } from './types.js'
