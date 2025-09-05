import { existsSync, rmSync } from 'node:fs'
import type { CoverageReport } from 'monocart-coverage-reports'
import MCR from 'monocart-coverage-reports'
import type { Logger } from './logger.js'
import { createLogger } from './logger.js'
import type { RequiredMonocartCoverageOptions, ScriptCoverageWithOffset } from './types.js'

export class MonocartReporter {
  private config: RequiredMonocartCoverageOptions
  private logger: Logger
  private mcr: CoverageReport | null = null
  private coverageDataCollection: any[] = []

  private constructor(config: RequiredMonocartCoverageOptions) {
    this.config = config
    this.logger = createLogger(config.logging)
  }

  static async create(config: RequiredMonocartCoverageOptions): Promise<MonocartReporter> {
    return new MonocartReporter(config)
  }

  async clean(): Promise<void> {
    if (this.config.outputDir && existsSync(this.config.outputDir)) {
      try {
        rmSync(this.config.outputDir, { recursive: true, force: true })
        this.logger.info(`Cleaned coverage output directory: ${this.config.outputDir}`)
      } catch (error) {
        console.warn(`Failed to clean coverage directory ${this.config.outputDir}:`, error)
      }
    }
  }

  private async initializeMCR(): Promise<void> {
    if (!this.mcr) {
      const config: any = {
        name: this.config.name,
        outputDir: this.config.outputDir,
        reports: this.config.reports,
        lcov: this.config.lcov,
        cleanCache: this.config.cleanCache,
        sourcePath: this.config.sourcePath,
        sourceFilter: this.config.sourceFilter,
        logging: this.config.logging,
        onEnd: this.config.onEnd,
      }

      this.mcr = MCR(config)

      /* v8 ignore next 3 - Hard to test, edge case */
      if (!this.mcr) {
        throw new Error('Failed to initialize Monocart Coverage Reports')
      }
    }
  }

  async addCoverageData(coverageData: ScriptCoverageWithOffset[]): Promise<void> {
    // if (!Array.isArray(coverageData)) {
    //   return
    // }

    // Normalize data: ensure functions is always an array
    const normalizedData = coverageData.map(entry => ({
      ...entry,
      functions: Array.isArray(entry.functions) ? entry.functions : [],
    }))

    // Like vitest-monocart-coverage: collect coverage data
    this.coverageDataCollection.push(...normalizedData)

    // Initialize MCR if not done yet
    await this.initializeMCR()

    // biome-ignore lint/style/noNonNullAssertion: we want it to fail if reporter is not set
    await this.mcr!.add(normalizedData)
  }

  async generateReport(coverageData?: unknown): Promise<void> {
    await this.initializeMCR()

    try {
      // Add any additional coverage data provided
      if (coverageData) {
        if (Array.isArray(coverageData)) {
          await this.addCoverageData(coverageData)
        } else {
          // For non-array coverage data, just skip it since we work with V8 data directly now
          this.logger.warn(
            'Non-V8 coverage data provided to generateReport, skipping transformation',
          )
        }
      }

      // Generate the final report
      // At this point MCR has all collected coverage data so we can just call generate
      // But for the sake of typeness we have to assume that mcr may be null here
      // biome-ignore lint/style/noNonNullAssertion: we want it to fail if reporter is not set
      await this.mcr!.generate()

      const { outputDir } = this.config
      console.log(`Monocart coverage report generated in: ${outputDir}`)
    } catch (error) {
      console.error('Failed to generate Monocart coverage report:', error)
      throw error
    }
  }
}
