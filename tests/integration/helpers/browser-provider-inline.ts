import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

/**
 * Injects the browser provider module directly into the page
 * This avoids issues with HTTP serving and module resolution
 */
export async function injectBrowserProvider(page: Page): Promise<void> {
  // Read the browser.js file from dist
  const browserJsPath = join(process.cwd(), 'dist', 'browser.js')
  const browserJsContent = readFileSync(browserJsPath, 'utf-8')

  // Create a script that makes the exports globally available
  const moduleScript = `
    // Create a module-like environment
    (function() {
      ${browserJsContent}
      
      // The exports are already available, just expose them globally
      window.__vitest_monocart_browser_provider__ = {
        MonocartBrowserProvider: MonocartBrowserProvider,
        MonocartBrowserProviderModule: MonocartBrowserProviderModule
      };
    })();
  `

  await page.addInitScript(moduleScript)
}

/**
 * Gets the browser provider from the injected module
 */
export async function getBrowserProvider(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const provider = window.__vitest_monocart_browser_provider__
    if (!provider) {
      throw new Error('Browser provider not injected. Call injectBrowserProvider first.')
    }
    return provider
  })
}
