import type { CoverageMap } from 'istanbul-lib-coverage'
import libCoverage from 'istanbul-lib-coverage'
import type { ProxifiedModule } from 'magicast'
import { parseModule } from 'magicast'
import type { AfterSuiteRunMeta } from 'vitest'
import { BaseCoverageProvider } from 'vitest/coverage'
import type { CoverageProvider, CoverageProviderModule, ReportContext, Vitest } from 'vitest/node'
import { resolveMonocartConfig } from './config.js'
import { MonocartReporter } from './reporter.js'
import type {
  MonocartCoverageOptions,
  ResolvedMonocartCoverageOptions,
  ScriptCoverageWithOffset,
} from './types.js'

// Extended coverage interface for browser mode
interface BrowserScriptCoverage extends ScriptCoverageWithOffset {
  source?: string
}

// CDP session interface for browser mode
interface CDPSession {
  send(method: string, params?: unknown): Promise<unknown>
  on(event: string, callback: (params: unknown) => void): void
}

// Browser runner interface provided by @vitest/browser
interface VitestBrowserRunner {
  cdp: CDPSession
}

// Browser location interface
interface BrowserLocation {
  origin: string
}

// Browser window interface
interface BrowserWindow {
  __vitest_browser_runner__: VitestBrowserRunner
  location: BrowserLocation
}

// Safe window access helper
function getBrowserWindow(): BrowserWindow | null {
  try {
    // Check if we're in a browser environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      const win = (globalThis as any).window
      if (win && typeof win === 'object') {
        return win as BrowserWindow
      }
    }
  } catch {
    // Ignore any errors accessing window
  }
  return null
}

/**
 * Browser coverage provider that integrates Vitest's browser mode
 * with Monocart coverage reporting using Chrome DevTools Protocol.
 *
 * The provider works by:
 * 1. Using CDP to collect V8 coverage data in browser environment
 * 2. Supporting both JavaScript and CSS coverage collection
 * 3. Filtering and processing browser-specific file paths
 * 4. Passing enriched data to Monocart for processing and report generation
 */
export class MonocartBrowserProvider
  extends BaseCoverageProvider<ResolvedMonocartCoverageOptions>
  implements CoverageProvider
{
  name = 'v8' as const

  private reporter?: MonocartReporter
  private scriptSources = new Map<string, string>()
  private coverageEnabled = false

  async initialize(ctx: Vitest): Promise<void> {
    // Align version with Vitest to prevent "mixed versions" warning
    this.version = ctx.version

    this._initialize(ctx)
    this.ctx = ctx

    const coverageConfig = ctx.config.coverage
    const customOptions = {
      ...((coverageConfig as { customOptions?: Partial<MonocartCoverageOptions> }).customOptions ||
        {}),
    }

    const resolvedConfig = await resolveMonocartConfig(customOptions, ctx)
    this.reporter = await MonocartReporter.create(resolvedConfig)

    // Configure Vitest to use V8 engine internally
    coverageConfig.provider = 'v8'
    delete (coverageConfig as any).customProviderModule

    this.options = {
      ...coverageConfig,
      reporter: [], // Disable built-in reporters
    } as ResolvedMonocartCoverageOptions
  }

  createCoverageMap(): CoverageMap {
    return libCoverage.createCoverageMap({})
  }

  resolveOptions(): ResolvedMonocartCoverageOptions {
    return this.options
  }

  async clean(_clean?: boolean): Promise<void> {
    // Clean is handled by Monocart itself
  }

  hasProvider(): boolean {
    return true
  }

  generateCoverage(_reportContext: ReportContext): Promise<CoverageMap> | CoverageMap {
    return this.createCoverageMap()
  }

  /**
   * Initialize CDP and start coverage collection
   */
  private async startCoverage(): Promise<void> {
    if (this.coverageEnabled) {
      return
    }

    const browserWindow = getBrowserWindow()
    if (!browserWindow) {
      return // Not in browser environment
    }

    const session = browserWindow.__vitest_browser_runner__?.cdp
    if (!session) {
      console.warn('[MonocartBrowserProvider] CDP session not available')
      return
    }

    try {
      // Enable JS coverage
      await session.send('Profiler.enable')
      await session.send('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true,
      })

      // Enable CSS coverage if configured
      const config = this.reporter?.config
      if (config?.css) {
        await session.send('CSS.enable')
        await session.send('CSS.startRuleUsageTracking')
      }

      // Set up script source collection
      session.on('Debugger.scriptParsed', (params: any) => {
        const { scriptId } = params
        session.send('Debugger.getScriptSource', { scriptId }).then((res: any) => {
          this.scriptSources.set(scriptId, res?.scriptSource || '')
        })
      })

      session.on('Debugger.paused', () => {
        session.send('Debugger.resume')
      })

      await session.send('Debugger.enable')
      await session.send('Debugger.setSkipAllPauses', { skip: true })

      this.coverageEnabled = true
    } catch (error) {
      console.error('[MonocartBrowserProvider] Failed to start coverage:', error)
    }
  }

  /**
   * Filter browser coverage results to include only relevant files
   */
  private filterBrowserResult(entry: BrowserScriptCoverage): boolean {
    if (!entry.url) {
      return false
    }

    const browserWindow = getBrowserWindow()
    const origin = browserWindow?.location.origin || ''

    // Must start with current origin
    if (!entry.url.startsWith(origin)) {
      return false
    }

    // Remove origin from URL for processing
    entry.url = decodeURIComponent(entry.url.replace(`${origin}/`, ''))

    // Filter out system files
    if (entry.url.includes('/node_modules/')) {
      return false
    }
    if (entry.url.startsWith('__vitest_')) {
      return false
    }
    if (entry.url.startsWith('@vite/')) {
      return false
    }

    // Handle @fs/ prefix (Vite file system access)
    const fsPrefix = '@fs/'
    if (entry.url.startsWith(fsPrefix)) {
      entry.url = entry.url.slice(fsPrefix.length)
    }

    return true
  }

  /**
   * Collect coverage data from CDP
   */
  private async takeCoverage(): Promise<BrowserScriptCoverage[]> {
    const browserWindow = getBrowserWindow()
    if (!browserWindow) {
      return []
    }

    const session = browserWindow.__vitest_browser_runner__?.cdp
    if (!session) {
      return []
    }

    try {
      const coverage = (await session.send('Profiler.takePreciseCoverage')) as {
        result: BrowserScriptCoverage[]
      }
      const result: BrowserScriptCoverage[] = []

      if (coverage?.result) {
        for (const entry of coverage.result) {
          // Set anonymous URL if missing
          entry.url = entry.url || ''

          if (!this.filterBrowserResult(entry)) {
            continue
          }

          // Add source from collected script sources
          const source = this.scriptSources.get(entry.scriptId || '')
          if (!source) {
            console.log(`[MonocartBrowserProvider] No source found for: ${entry.url}`)
          }
          entry.source = source || ''

          result.push(entry)
        }
      }

      return result
    } catch (error) {
      console.error('[MonocartBrowserProvider] Failed to take coverage:', error)
      return []
    }
  }

  /**
   * Critical hook: intercepts coverage data after each suite runs in browser
   */
  async onAfterSuiteRun(_meta: AfterSuiteRunMeta): Promise<void> {
    await this.startCoverage()

    try {
      const coverageData = await this.takeCoverage()

      if (coverageData.length > 0 && this.reporter) {
        // Cast to the expected type since we ensure compatibility
        await this.reporter.addCoverageData(coverageData as ScriptCoverageWithOffset[])
      }
    } catch (error) {
      console.error(
        '[MonocartBrowserProvider] Failed to process coverage in onAfterSuiteRun:',
        error,
      )
    }
  }

  /**
   * Generate final coverage reports when all tests have completed
   */
  async reportCoverage(_coverage: unknown, reportContext: ReportContext): Promise<void> {
    const { allTestsRun } = reportContext

    if (!allTestsRun || !this.reporter) {
      return
    }

    try {
      await this.reporter.generateReport()
    } catch (error) {
      console.error('[MonocartBrowserProvider] Failed to generate final report:', error)
    }
  }

  async generateReports(_coverageMap: CoverageMap, _allTestsRun?: boolean): Promise<void> {
    // No-op: reports are generated in reportCoverage()
  }

  async parseConfigModule(configFilePath: string): Promise<ProxifiedModule<any>> {
    return parseModule(
      await import('node:fs/promises').then(fs => fs.readFile(configFilePath, 'utf8')),
    )
  }
}

export const MonocartBrowserProviderModule: CoverageProviderModule = {
  getProvider(): CoverageProvider {
    return new MonocartBrowserProvider()
  },

  takeCoverage() {
    // Browser coverage is handled by CDP in onAfterSuiteRun
    return {}
  },
}
