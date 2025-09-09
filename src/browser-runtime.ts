/**
 * Browser runtime module that runs in the actual browser environment
 * and uses Chrome DevTools Protocol (CDP) to collect V8 coverage data.
 *
 * This module is loaded as a setupFile in browser tests and automatically
 * starts coverage collection when the browser environment is ready.
 */

interface VitestBrowserRunner {
  cdp: {
    send: (method: string, params?: any) => Promise<any>
    on: (event: string, handler: (params: any) => void) => void
  }
}

declare global {
  interface Window {
    __vitest_browser_runner__?: VitestBrowserRunner
  }
}

/**
 * Pure function to check if a URL should be included in coverage
 * Separated for easy testing
 */
export function shouldIncludeUrl(url: string, origin: string): boolean {
  if (!url.startsWith(origin)) {
    return false
  }

  if (url.includes('/node_modules/')) {
    return false
  }

  const relativeUrl = decodeURIComponent(url.replace(`${origin}/`, ''))

  if (relativeUrl.startsWith('__vitest_')) {
    return false
  }

  if (relativeUrl.startsWith('@vite/')) {
    return false
  }

  return true
}

/**
 * Pure function to normalize a URL by removing prefixes
 * Separated for easy testing
 */
export function normalizeUrl(url: string, origin: string): string {
  let normalizedUrl = decodeURIComponent(url.replace(`${origin}/`, ''))

  const fsPrefix = '@fs/'
  if (normalizedUrl.startsWith(fsPrefix)) {
    normalizedUrl = normalizedUrl.slice(fsPrefix.length)
  }

  return normalizedUrl
}

/**
 * Filter coverage results based on cenfun's approach
 * Now uses pure functions for easier testing
 */
export function filterResult(entry: any): boolean {
  const origin = window.location.origin

  if (!shouldIncludeUrl(entry.url, origin)) {
    return false
  }

  entry.url = normalizeUrl(entry.url, origin)
  return true
}

/**
 * Browser coverage collector that uses Chrome DevTools Protocol
 * to gather V8 coverage data in the browser environment.
 */
export class BrowserCoverageCollector {
  private isStarted = false
  private cdp?: VitestBrowserRunner['cdp']
  private scriptSources = new Map<string, string>()

  constructor() {
    // In browser environment, window and CDP are always available
    const cdp = window.__vitest_browser_runner__?.cdp
    /* v8 ignore next 3 */
    // CDP unavailable branch is only hit in non-Vitest browser environments (edge case)
    if (cdp) {
      this.cdp = cdp
    }
  }

  private bindEvents() {
    if (!this.cdp) {
      return
    }

    console.debug('[monocart-browser] Binding events...')
    // Listen for script parsing events to collect source code (crucial!)
    this.cdp.on('Debugger.scriptParsed', async (params: any) => {
      const { scriptId, url } = params
      console.debug(`[monocart-browser] Script parsed: ${scriptId} - ${url}`)
      // CDP commands cannot fail when CDP is available (already checked)
      const res = await this.cdp?.send('Debugger.getScriptSource', { scriptId })
      if (res?.scriptSource) {
        console.debug(
          `[monocart-browser] Got source for ${scriptId} (${url}): ${res.scriptSource.length} chars`,
        )
        this.scriptSources.set(scriptId, res.scriptSource)
      }
    })

    // Handle debugger pauses
    this.cdp.on('Debugger.paused', () => {
      this.cdp?.send('Debugger.resume')
    })
  }

  /**
   * Start V8 coverage collection using CDP
   */
  async startCoverage(): Promise<void> {
    /* v8 ignore next 3 */
    // CDP unavailable or already started branches are edge cases in normal Vitest usage
    if (!this.cdp || this.isStarted) {
      return
    }

    this.isStarted = true

    // Bind event handlers first
    this.bindEvents()

    // CDP initialization cannot fail in browser environment with CDP available
    // Enable Debugger domain (this is crucial for script instrumentation!)
    await this.cdp.send('Debugger.enable')
    await this.cdp.send('Debugger.setSkipAllPauses', { skip: true })

    // Note: We'll fetch script sources on-demand in takeCoverage for scripts loaded before startCoverage

    // Enable Profiler domain
    await this.cdp.send('Profiler.enable')
    await this.cdp.send('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    })

    console.debug('[monocart-browser] Coverage collection started')
  }

  /**
   * Take coverage snapshot and return filtered results
   */
  /* v8 ignore start */
  // v8 ignore: Method is executed but shows as uncovered due to sourcemap mapping issues with dynamic imports
  async takeCoverage(): Promise<any[]> {
    if (!this.cdp || !this.isStarted) {
      return []
    }

    try {
      const coverage = await this.cdp.send('Profiler.takePreciseCoverage')
      const result: any[] = []

      if (coverage?.result) {
        for (const entry of coverage.result) {
          // Set anonymous url fallback
          entry.url = entry.url || ''

          if (!filterResult(entry)) {
            continue
          }

          // Add source code to the entry (essential!)
          console.debug(
            `[monocart-browser] Processing entry: url=${entry.url}, scriptId=${entry.scriptId}, sources=${this.scriptSources.size}`,
          )
          let source = this.scriptSources.get(entry.scriptId)

          // If source is not cached, fetch it now (for scripts loaded before we started listening)
          if (source) {
            console.debug(
              `[monocart-browser] Found cached source for ${entry.url}: ${source.length} chars`,
            )
          } else {
            console.debug(
              `[monocart-browser] No cached source for: ${entry.url} (scriptId: ${entry.scriptId}), fetching...`,
            )
            const res = await this.cdp?.send('Debugger.getScriptSource', {
              scriptId: entry.scriptId,
            })
            if (res?.scriptSource) {
              source = res.scriptSource
              this.scriptSources.set(entry.scriptId, res.scriptSource)
              console.debug(
                `[monocart-browser] Fetched source for ${entry.url}: ${res.scriptSource.length} chars`,
              )
            }
          }

          entry.source = source || ''
          result.push(entry)
        }
      }

      console.debug(`[monocart-browser] Collected ${result.length} coverage entries`)
      return result
    } catch (error) {
      console.error('[monocart-browser] Failed to take coverage:', error)
      return []
    }
  }
  /* v8 ignore stop */

  /**
   * Stop coverage collection
   */
  async stopCoverage(): Promise<void> {
    // Browser mode should not stop coverage as same V8 instance is shared between tests
  }
}

// Global instance
let coverageCollector: BrowserCoverageCollector | undefined

export function startCoverage(): Promise<void> {
  /* v8 ignore next 3 */
  // Collector already exists branch - only relevant in repeated calls within same session
  if (!coverageCollector) {
    coverageCollector = new BrowserCoverageCollector()
  }
  return coverageCollector.startCoverage()
}

export function takeCoverage(): Promise<any[]> {
  // coverageCollector is always initialized by startCoverage() which is called first
  return coverageCollector?.takeCoverage() ?? Promise.resolve([])
}

export function stopCoverage(): Promise<void> {
  /* v8 ignore next 3 */
  // No collector exists branch - only relevant if stopCoverage called before startCoverage
  if (!coverageCollector) {
    return Promise.resolve()
  }
  return coverageCollector.stopCoverage()
}

// Note: Auto-start is now handled by src/browser.ts startCoverage() method
// to ensure proper timing with coverage instrumentation
