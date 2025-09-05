import path from 'node:path'
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

// RawCoverage is also not exported, so we define a minimal version here
interface RawCoverage {
  result: ScriptCoverageWithOffset[]
}

/**
 * Custom coverage provider that integrates Vitest's V8 coverage engine
 * with Monocart coverage reporting for enhanced visualization and features.
 *
 * The provider works by:
 * 1. Configuring Vitest to use V8 internally for data collection
 * 2. Intercepting raw V8 coverage data in onAfterSuiteRun
 * 3. Enriching V8 data with source maps from Vite's transform cache
 * 4. Passing enriched data to Monocart for processing and report generation
 */

// Get version from package.json
import pkg from '../package.json' with { type: 'json' }

const VERSION: string = pkg.version

export class MonocartCoverageProvider
  extends BaseCoverageProvider<ResolvedMonocartCoverageOptions>
  implements CoverageProvider
{
  name = 'v8' as const
  // get version from package.json
  version = VERSION

  private reporter?: MonocartReporter

  async initialize(ctx: Vitest): Promise<void> {
    this.version = ctx.version

    this._initialize(ctx)
    this.ctx = ctx

    const coverageConfig = ctx.config.coverage
    // Extract customOptions from the coverage config (safely typed)
    const customOptions = {
      ...((coverageConfig as { customOptions?: Partial<MonocartCoverageOptions> }).customOptions ||
        {}),
    }

    const resolvedConfig = await resolveMonocartConfig(customOptions, ctx)
    this.reporter = await MonocartReporter.create(resolvedConfig)

    // Configure Vitest to use V8 engine internally while we handle the reporting
    coverageConfig.provider = 'v8'
    delete (coverageConfig as any).customProviderModule

    this.options = {
      ...coverageConfig,
      reporter: [], // Disable built-in reporters since we handle reporting ourselves
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
    // Return empty coverage map as we handle data processing in onAfterSuiteRun
    return this.createCoverageMap()
  }

  /**
   * Critical hook: intercepts V8 coverage data after each suite runs.
   * This is where we enrich raw V8 data with source maps and compiled code.
   */
  async onAfterSuiteRun(meta: AfterSuiteRunMeta): Promise<void> {
    const { transformMode, projectName } = meta
    const coverage = (meta as any).coverage as RawCoverage

    try {
      const coverageData = coverage.result

      // Get Vite's transform cache containing compiled source and source maps
      const viteNode =
        (this.ctx as any).projects?.find((project: any) => project.name === projectName)
          ?.vitenode || (this.ctx as any).vitenode
      const fetchCache = transformMode
        ? viteNode?.fetchCaches?.[transformMode]
        : viteNode?.fetchCache
      const transformResults = this.normalizeTransformResults(fetchCache)

      // Enrich each V8 entry with source and source map data
      coverageData.forEach((entry: any) => {
        if (entry.source) {
          return
        }

        let filePath: string
        try {
          filePath = this.formatPath(new URL(entry.url).pathname)
        } catch {
          return
        }

        const result = transformResults.get(filePath)
        if (result) {
          const { code, map } = result

          // Account for Node.js VM wrapper when executing code
          const WRAPPER_LENGTH = entry.startOffset || 185
          entry.scriptOffset = WRAPPER_LENGTH
          entry.source = code

          if (map) {
            const relPath = this.relativePath(filePath)
            map.sources = [relPath]
            entry.sourceMap = map
          }
        }
      })

      // Pass enriched coverage data to our reporter for processing
      // ignore forbidden non-null assertion since we want it to fail if reporter is not set
      // biome-ignore lint/style/noNonNullAssertion: we want it to fail if reporter is not set
      await this.reporter!.addCoverageData(coverageData)
    } catch (error) {
      console.error('[MonocartProvider] Failed to process coverage in onAfterSuiteRun:', error)
    }
  }

  /**
   * Generate final coverage reports when all tests have completed.
   */
  async reportCoverage(_coverage: unknown, reportContext: ReportContext): Promise<void> {
    const { allTestsRun } = reportContext

    if (!allTestsRun || !this.reporter) {
      return
    }

    try {
      await this.reporter.generateReport()
    } catch (error) {
      console.error('[MonocartProvider] Failed to generate final report:', error)
    }
  }

  /* v8 ignore next 3 - Edge case hard to test */
  async generateReports(_coverageMap: CoverageMap, _allTestsRun?: boolean): Promise<void> {
    // No-op: reports are generated in reportCoverage() to avoid double processing
  }

  /* v8 ignore next 5 - Edge case hard to test */
  async parseConfigModule(configFilePath: string): Promise<ProxifiedModule<any>> {
    return parseModule(
      await import('node:fs/promises').then(fs => fs.readFile(configFilePath, 'utf8')),
    )
  }

  /**
   * Normalize file paths to use forward slashes consistently.
   */
  private formatPath(str: string): string {
    return str ? str.replace(/\\/g, '/') : str
  }

  /**
   * Get relative path from current working directory.
   */
  private relativePath(p: string, root?: string): string {
    const resolvedPath = `${p}`
    const resolvedRoot = `${root || process.cwd()}`
    const rp = path.relative(resolvedRoot, resolvedPath)
    return this.formatPath(rp)
  }

  /**
   * Extract transform results from Vite's fetch cache.
   * Returns a map of file paths to their compiled code and source maps.
   * We want a map of filePath -> { code, map } with a last-write-wins strategy.
   */
  private normalizeTransformResults(fetchCache: any): Map<string, any> {
    const normalized = new Map()
    if (fetchCache) {
      for (const [cleanEntry, value] of fetchCache.entries()) {
        normalized.set(cleanEntry, value.result)
      }
    }
    return normalized
  }
}

export const MonocartCoverageProviderModule: CoverageProviderModule = {
  getProvider(): CoverageProvider {
    return new MonocartCoverageProvider()
  },

  takeCoverage() {
    // Return empty object as we handle coverage data in onAfterSuiteRun
    return {}
  },
}
