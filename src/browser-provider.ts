import type { CoverageMap } from 'istanbul-lib-coverage'
import libCoverage from 'istanbul-lib-coverage'
import type { ProxifiedModule } from 'magicast'
import { parseModule } from 'magicast'
import type { AfterSuiteRunMeta } from 'vitest'
import { BaseCoverageProvider } from 'vitest/coverage'
import type { CoverageProvider, ReportContext, Vitest } from 'vitest/node'
import { resolveMonocartConfig } from './config.js'
import { loggerFactory } from './logger.js'
import { MonocartReporter } from './reporter.js'
import type {
  MonocartCoverageOptions,
  ResolvedMonocartCoverageOptions,
  ScriptCoverageWithOffset,
} from './types.js'

// Module-level logger - deferred initialization
// const logger = loggerFactory.getModuleLogger(import.meta.url)

// Extended coverage interface for browser mode
// Keep for reference: browser collects ScriptCoverageWithOffset with `source` attached
// type BrowserScriptCoverage = ScriptCoverageWithOffset & { source?: string }

// Note: This module runs in Node. Do not access browser globals directly here.

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
  private addQueue: Promise<void> = Promise.resolve()
  private didGenerateReports = false
  private logger = loggerFactory.getModuleLogger(import.meta.url)

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
    // Logger level is already set by resolveMonocartConfig via loggerFactory.setLevel()
    this.reporter = await MonocartReporter.create(resolvedConfig)

    this.logger.debug('[browser-provider] Provider initialized successfully')

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
   * Critical hook: intercepts coverage data after each suite runs in browser
   * The browser runtime module handles CDP collection, we process the results here
   */
  async onAfterSuiteRun(meta: AfterSuiteRunMeta): Promise<void> {
    this.logger.debug('[browser-provider] onAfterSuiteRun called')

    try {
      // The coverage data is collected by the browser runtime module
      // and passed through Vitest's meta object
      const raw = (meta as any)?.coverage
      let coverageData: ScriptCoverageWithOffset[] = []

      if (Array.isArray(raw)) {
        coverageData = raw
      } else if (raw && Array.isArray(raw.result)) {
        coverageData = raw.result
      }

      this.logger.info(`[browser-provider] Coverage data received: ${coverageData.length} entries`)

      if (coverageData.length > 0 && this.reporter) {
        const p = Promise.resolve(this.reporter.addCoverageData(coverageData) as any)
        // Chain into queue for final drain in reportCoverage
        this.addQueue = this.addQueue.then(() => p.catch(() => {}))
        await p
        this.logger.info('Coverage data added to reporter')
      } else {
        this.logger.warn('No coverage data or reporter unavailable')
      }
    } catch (error) {
      this.logger.error(`Failed to process coverage in onAfterSuiteRun: ${error}`)
    }
  }

  /**
   * Generate final coverage reports when all tests have completed
   */
  async reportCoverage(_coverage: unknown, _reportContext: ReportContext): Promise<void> {
    this.logger.debug(
      `[browser-provider] reportCoverage called, didGenerateReports: ${this.didGenerateReports}, hasReporter: ${!!this.reporter}`,
    )
    if (this.didGenerateReports || !this.reporter) {
      return
    }
    // Drain any in-flight addCoverageData tasks, including those enqueued while waiting.
    // Loop until the queue reference stays stable after awaiting.
    // This ensures we don't miss the last suite's data due to races.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = this.addQueue
      await current
      if (this.addQueue === current) {
        break
      }
    }
    this.didGenerateReports = true
    try {
      await this.reporter.generateReport()
    } catch (error) {
      this.logger.error(`Failed to generate final report: ${error}`)
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
