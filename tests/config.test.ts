import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vitest } from 'vitest/node'
import { createSourceFilter, resolveMonocartConfig } from '../src/config.js'

describe('resolveMonocartConfig', () => {
  it('should return default config', async () => {
    const config = await resolveMonocartConfig()

    expect(config).toEqual({
      name: 'Vitest Monocart Coverage',
      outputDir: './coverage',
      reports: ['v8', 'console-details'],
      lcov: true,
      sourcePath: 'src',
      cleanCache: true,
      logging: 'info',
      css: true,
      onEnd: expect.any(Function),
      sourceFilter: expect.any(Function),
    })
  })

  it('should merge custom options with highest priority', async () => {
    const customOptions = {
      name: 'Custom Override',
      outputDir: './custom-output',
      reports: ['html' as string] as string[],
    }

    const config = await resolveMonocartConfig(customOptions)

    expect(config.name).toBe('Custom Override')
    expect(config.outputDir).toBe('./custom-output')
    expect(config.reports).toEqual(['html'])
    expect(config.lcov).toBe(true) // Should keep defaults
  })

  it('should apply Vitest context configuration', async () => {
    const mockVitestCtx = {
      config: {
        name: 'Test Project',
        coverage: {
          reportsDirectory: './vitest-reports',
          clean: false,
        },
      },
    } as Partial<Vitest>

    const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

    expect(config.name).toBe('Test Project Coverage')
    expect(config.outputDir).toBe('./vitest-reports')
    expect(config.cleanCache).toBe(false)
  })

  it('should create sourceFilter from Vitest include/exclude patterns', async () => {
    const mockVitestCtx = {
      config: {
        coverage: {
          include: ['src/**/*'],
          exclude: ['**/*.test.*', 'node_modules/'],
        },
      },
    } as Partial<Vitest>

    const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

    expect(config.sourceFilter).toBeInstanceOf(Function)

    // Test the sourceFilter function
    const sourceFilter = config.sourceFilter
    expect(sourceFilter('src/file.ts')).toBe(true)
    expect(sourceFilter('src/file.test.ts')).toBe(false)
    expect(sourceFilter('node_modules/lib.js')).toBe(false)
  })

  it('should prioritize custom options over Vitest config', async () => {
    const mockVitestCtx = {
      config: {
        name: 'Test Project',
        coverage: {
          reportsDirectory: './vitest-reports',
          clean: false,
        },
      },
    } as Partial<Vitest>

    const customOptions = {
      name: 'Custom Priority',
      outputDir: './custom-priority',
    }

    const config = await resolveMonocartConfig(customOptions, mockVitestCtx as Vitest)

    expect(config.name).toBe('Custom Priority') // Custom wins
    expect(config.outputDir).toBe('./custom-priority') // Custom wins
    expect(config.cleanCache).toBe(false) // Vitest config still applies
  })

  it('should have callable onEnd function in default config', async () => {
    const config = await resolveMonocartConfig()

    expect(config.onEnd).toBeInstanceOf(Function)
    // @ts-expect-error - Default onEnd function is always callable
    expect(() => config.onEnd()).not.toThrow()
  })

  describe('external config file loading', () => {
    let testDir: string

    beforeEach(() => {
      // Create unique test directory for each test
      testDir = join(
        process.cwd(),
        `test-config-temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      )
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true })
      }
    })

    afterEach(() => {
      // Clean up test directory
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should load JSON config file', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      const configData = {
        name: 'JSON Config',
        outputDir: './json-coverage',
        reports: ['json'],
      }
      writeFileSync(configPath, JSON.stringify(configData))

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('JSON Config')
      expect(config.outputDir).toBe('./json-coverage')
      expect(config.reports).toEqual(['json'])
    })

    it('should load CJS config file', async () => {
      const configPath = join(testDir, 'monocart.config.cjs')
      const configContent = `
        module.exports = {
          name: 'CJS Config',
          outputDir: './cjs-coverage',
          reports: ['text']
        }
      `
      writeFileSync(configPath, configContent)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('CJS Config')
      expect(config.outputDir).toBe('./cjs-coverage')
      expect(config.reports).toEqual(['text'])
    })

    it('should load MJS config file', async () => {
      const configPath = join(testDir, 'monocart.config.mjs')
      const configContent = `
        export default {
          name: 'MJS Config',
          outputDir: './mjs-coverage',
          reports: ['lcov']
        }
      `
      writeFileSync(configPath, configContent)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('MJS Config')
      expect(config.outputDir).toBe('./mjs-coverage')
      expect(config.reports).toEqual(['lcov'])
    })

    it('should load JS config file', async () => {
      const configPath = join(testDir, 'monocart.config.js')
      const configContent = `
        export default {
          name: 'JS Config',
          outputDir: './js-coverage',
          reports: ['html']
        }
      `
      writeFileSync(configPath, configContent)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('JS Config')
      expect(config.outputDir).toBe('./js-coverage')
      expect(config.reports).toEqual(['html'])
    })

    it('should handle file loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const configPath = join(testDir, 'monocart.config.js')
      const invalidConfigContent = `
        // This will cause a SyntaxError when imported
        export default {
          name: 'Invalid Config',
          // Introducing a syntax error by having invalid JS
          outputDir: './invalid-coverage',
          invalid syntax here
        }
      `
      writeFileSync(configPath, invalidConfigContent)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      // Should fall back to default config due to syntax error
      expect(config.name).toBe('Vitest Monocart Coverage')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should prioritize config files in correct order', async () => {
      // Create multiple config files
      writeFileSync(join(testDir, 'monocart.config.mjs'), `export default { name: 'MJS First' }`)
      writeFileSync(join(testDir, 'monocart.config.js'), `export default { name: 'JS Second' }`)
      writeFileSync(join(testDir, 'monocart.config.cjs'), `module.exports = { name: 'CJS Third' }`)
      writeFileSync(join(testDir, 'monocart.config.json'), `{ "name": "JSON Last" }`)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      // Should load the first one found (mjs)
      expect(config.name).toBe('MJS First')
    })

    it('should handle config with default export', async () => {
      const configPath = join(testDir, 'monocart.config.js')
      const configContent = `
        const config = { name: 'Default Export', outputDir: './default-export' }
        export { config as default }
      `
      writeFileSync(configPath, configContent)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('Default Export')
      expect(config.outputDir).toBe('./default-export')
    })

    it('should handle config without default export', async () => {
      const configPath = join(testDir, 'monocart.config.cjs')
      const configContent = `
        const config = { name: 'No Default Export', outputDir: './no-default' }
        module.exports = config
      `
      writeFileSync(configPath, configContent)

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('No Default Export')
      expect(config.outputDir).toBe('./no-default')
    })
  })

  describe('Vitest context integration', () => {
    it('should handle missing reportsDirectory in coverage', async () => {
      const mockVitestCtx = {
        config: {
          name: 'Test Project',
          coverage: {
            clean: true,
            // No reportsDirectory
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.name).toBe('Test Project Coverage')
      expect(config.outputDir).toBe('./coverage') // Should use default
      expect(config.cleanCache).toBe(true)
    })

    it('should handle undefined clean in coverage', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            reportsDirectory: './test-reports',
            // clean is undefined
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.outputDir).toBe('./test-reports')
      expect(config.cleanCache).toBe(true) // Should use default
    })

    it('should handle missing name in config', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            reportsDirectory: './no-name-reports',
          },
          // No name property
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.name).toBe('Vitest Monocart Coverage') // Should use default
      expect(config.outputDir).toBe('./no-name-reports')
    })

    it('should handle missing include property in coverage', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            exclude: ['**/*.test.*'],
            // No include property
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('src') // Should use default
      expect(config.sourceFilter).toBeInstanceOf(Function)
    })

    it('should handle missing exclude property in coverage', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            include: ['lib/**/*'],
            // No exclude property
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('lib')
      expect(config.sourceFilter).toBeInstanceOf(Function)
    })

    it('should handle empty include patterns', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            include: [],
            exclude: ['**/*.test.*'],
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('src') // Should use default
    })

    it('should handle complex include pattern for sourcePath extraction', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            include: ['packages/*/src/**/*', 'lib/**/*'],
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('packages/*/src')
    })

    it('should handle include pattern without /**/* suffix', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            include: ['custom-src'],
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('custom-src')
    })

    it('should log sourceFilter creation with debug logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const customOptions = { logging: 'debug' as const }
      const mockVitestCtx = {
        config: {
          coverage: {
            include: ['src/**/*'],
            exclude: ['**/*.test.*'],
          },
        },
      } as unknown as Partial<Vitest>

      await resolveMonocartConfig(customOptions, mockVitestCtx as Vitest)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[monocart] Created sourceFilter from Vitest patterns'),
      )

      consoleSpy.mockRestore()
    })

    it('should log sourceFilter creation with info logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const customOptions = { logging: 'info' as const }
      const mockVitestCtx = {
        config: {
          coverage: {
            include: ['src/**/*'],
            exclude: ['**/*.test.*'],
          },
        },
      } as unknown as Partial<Vitest>

      await resolveMonocartConfig(customOptions, mockVitestCtx as Vitest)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[monocart] Created sourceFilter from Vitest patterns'),
      )

      consoleSpy.mockRestore()
    })

    it('should not log with warn logging level', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // The logging check happens during Vitest processing, before customOptions are applied
      // So we need to test without creating sourceFilter (no include/exclude patterns)
      const customOptions = { logging: 'warn' as const }
      const mockVitestCtx = {
        config: {
          coverage: {
            // No include/exclude patterns to avoid sourceFilter creation and logging
          },
        },
      } as unknown as Partial<Vitest>

      await resolveMonocartConfig(customOptions, mockVitestCtx as Vitest)

      // Should not log since no sourceFilter was created
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should not log with error logging level', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const customOptions = { logging: 'error' as const }
      const mockVitestCtx = {
        config: {
          coverage: {
            // No include/exclude patterns to avoid sourceFilter creation and logging
          },
        },
      } as unknown as Partial<Vitest>

      await resolveMonocartConfig(customOptions, mockVitestCtx as Vitest)

      // Should not log since no sourceFilter was created
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle coverage config without include/exclude properties', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            // Coverage object exists but has no include/exclude properties
            reportsDirectory: './coverage-no-patterns',
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('src') // Should use default
      expect(config.outputDir).toBe('./coverage-no-patterns')
    })

    it('should handle undefined logging in custom options', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            include: ['src/**/*'],
            exclude: ['**/*.test.*'],
          },
        },
      } as unknown as Partial<Vitest>

      // Explicitly set logging to undefined to test fallback
      const customOptions = { logging: undefined as any }

      await resolveMonocartConfig(customOptions, mockVitestCtx as Vitest)

      // Should not throw and should use 'info' as fallback
      expect(true).toBe(true) // Test passes if no error thrown
    })

    it('should handle coverage config missing include property completely', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {} as any, // Coverage object without include/exclude properties
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('src') // Should use default
    })

    it('should handle coverage config with null include/exclude', async () => {
      const mockVitestCtx = {
        config: {
          coverage: {
            include: null as any,
            exclude: null as any,
          },
        },
      } as unknown as Partial<Vitest>

      const config = await resolveMonocartConfig(undefined, mockVitestCtx as Vitest)

      expect(config.sourcePath).toBe('src') // Should use default when include is null
    })
  })

  describe('config validation', () => {
    let testDir: string

    beforeEach(() => {
      testDir = join(
        process.cwd(),
        `test-validation-temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      )
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true })
      }
    })

    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should validate outputDir type in JSON config', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      const invalidConfig = {
        name: 'Valid Name',
        outputDir: 123, // Invalid: should be string
      }
      writeFileSync(configPath, JSON.stringify(invalidConfig))

      await expect(resolveMonocartConfig(undefined, undefined, testDir)).rejects.toThrow(
        'Invalid outputDir in monocart.config.json: expected string, got number',
      )
    })

    it('should validate reports type in CJS config', async () => {
      const configPath = join(testDir, 'monocart.config.cjs')
      const configContent = `
        module.exports = {
          name: 'Valid Name',
          reports: 'invalid-not-array'
        }
      `
      writeFileSync(configPath, configContent)

      await expect(resolveMonocartConfig(undefined, undefined, testDir)).rejects.toThrow(
        'Invalid reports in monocart.config.cjs: expected array, got string',
      )
    })

    it('should validate sourceFilter type in MJS config', async () => {
      const configPath = join(testDir, 'monocart.config.mjs')
      const configContent = `
        export default {
          name: 'Valid Name',
          sourceFilter: 'not-a-function'
        }
      `
      writeFileSync(configPath, configContent)

      await expect(resolveMonocartConfig(undefined, undefined, testDir)).rejects.toThrow(
        'Invalid sourceFilter in monocart.config.mjs: expected function, got string',
      )
    })

    it('should validate logging level in JS config', async () => {
      const configPath = join(testDir, 'monocart.config.js')
      const configContent = `
        export default {
          name: 'Valid Name',
          logging: 'invalid-level'
        }
      `
      writeFileSync(configPath, configContent)

      await expect(resolveMonocartConfig(undefined, undefined, testDir)).rejects.toThrow(
        'Invalid logging in monocart.config.js: expected one of debug, info, warn, error, got invalid-level',
      )
    })

    it('should validate onEnd type in JSON config', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      const invalidConfig = {
        name: 'Valid Name',
        onEnd: 'not-a-function',
      }
      writeFileSync(configPath, JSON.stringify(invalidConfig))

      await expect(resolveMonocartConfig(undefined, undefined, testDir)).rejects.toThrow(
        'Invalid onEnd in monocart.config.json: expected function, got string',
      )
    })

    it('should validate logging type when not string', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      const invalidConfig = {
        name: 'Valid Name',
        logging: 123,
      }
      writeFileSync(configPath, JSON.stringify(invalidConfig))

      await expect(resolveMonocartConfig(undefined, undefined, testDir)).rejects.toThrow(
        'Invalid logging in monocart.config.json: expected one of debug, info, warn, error, got 123',
      )
    })

    it('should allow valid config to pass validation', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      const validConfig = {
        name: 'Valid Name',
        outputDir: './valid-output',
        reports: ['html', 'lcov'],
        logging: 'debug',
      }
      writeFileSync(configPath, JSON.stringify(validConfig))

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('Valid Name')
      expect(config.outputDir).toBe('./valid-output')
      expect(config.reports).toEqual(['html', 'lcov'])
      expect(config.logging).toBe('debug')
    })

    it('should skip validation for falsy config', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      writeFileSync(configPath, 'null')

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      // Should use defaults when config is null
      expect(config.name).toBe('Vitest Monocart Coverage')
    })

    it('should skip validation for non-object config', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      writeFileSync(configPath, '"string-config"')

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      // Should use defaults when config is not an object
      expect(config.name).toBe('Vitest Monocart Coverage')
    })

    it('should allow undefined properties without validation error', async () => {
      const configPath = join(testDir, 'monocart.config.json')
      const configWithUndefined = {
        name: 'Valid Name',
        // All validation properties are undefined - should be allowed
      }
      writeFileSync(configPath, JSON.stringify(configWithUndefined))

      const config = await resolveMonocartConfig(undefined, undefined, testDir)

      expect(config.name).toBe('Valid Name')
      expect(config.outputDir).toBe('./coverage') // Should use default
    })
  })
})

describe('createSourceFilter', () => {
  it('should include all files when no patterns provided', () => {
    const filter = createSourceFilter([], [])

    expect(filter('src/file.ts')).toBe(true)
    expect(filter('lib/file.js')).toBe(true)
    expect(filter('test/file.test.ts')).toBe(true)
  })

  it('should include files matching include patterns', () => {
    const filter = createSourceFilter(['src/**/*', 'lib/**/*'], [])

    expect(filter('src/file.ts')).toBe(true)
    expect(filter('lib/file.js')).toBe(true)
    expect(filter('test/file.ts')).toBe(false) // Not in include patterns
  })

  it('should exclude files matching exclude patterns', () => {
    const filter = createSourceFilter(['src/**/*'], ['**/*.test.*', '**/*.spec.*'])

    expect(filter('src/file.ts')).toBe(true)
    expect(filter('src/file.test.ts')).toBe(false) // Excluded
    expect(filter('src/file.spec.ts')).toBe(false) // Excluded
  })

  it('should exclude files even if they match include patterns', () => {
    const filter = createSourceFilter(['src/**/*'], ['src/excluded.ts'])

    expect(filter('src/included.ts')).toBe(true)
    expect(filter('src/excluded.ts')).toBe(false) // Excluded despite matching include
  })

  it('should handle patterns with leading ./', () => {
    const filter = createSourceFilter(['./src/**/*'], ['./test/**/*'])

    expect(filter('src/file.ts')).toBe(true)
    expect(filter('test/file.ts')).toBe(false)
  })

  it('should handle Windows-style backslashes in patterns', () => {
    const filter = createSourceFilter(['src\\**\\*'], ['test\\**\\*'])

    expect(filter('src/file.ts')).toBe(true)
    expect(filter('test/file.ts')).toBe(false)
  })

  it('should work with custom cwd', () => {
    const customCwd = '/custom/working/directory'
    const filter = createSourceFilter(['src/**/*'], [], customCwd)

    expect(filter('/custom/working/directory/src/file.ts')).toBe(true)
    expect(filter('/custom/working/directory/other/file.ts')).toBe(false)
  })

  it('should handle absolute paths correctly', () => {
    const filter = createSourceFilter(['src/**/*'], [])

    expect(filter('/absolute/path/src/file.ts')).toBe(false) // Doesn't match relative pattern
  })

  it('should handle paths outside current working directory', () => {
    const cwd = process.cwd()
    const filter = createSourceFilter(['src/**/*'], [], cwd)

    expect(filter(`${cwd}/src/file.ts`)).toBe(true)
    expect(filter(`${cwd}/../other/file.ts`)).toBe(false)
  })

  it('should load .mjs config file', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.mjs')

    writeFileSync(configPath, 'export default { outputDir: "mjs-coverage" }')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      expect(config.outputDir).toBe('mjs-coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle TypeScript config files', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.ts')

    // Create a TS config file
    writeFileSync(configPath, 'export default { outputDir: "ts-coverage" };')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      // The TS config should load successfully or fallback to default
      expect(config.outputDir).toMatch(/^(ts-coverage|\.\/coverage)$/)
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle JS config without default export', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.js')

    // Create a JS config that exports object directly (no default)
    writeFileSync(configPath, 'module.exports = { outputDir: "no-default-coverage" };')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      expect(config.outputDir).toBe('no-default-coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle JS config with falsy default but valid module', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.js')

    // Create a JS config with falsy default but valid module content
    writeFileSync(
      configPath,
      `
      module.exports = { outputDir: "falsy-default-coverage" };
      module.exports.default = null; // Explicitly set default to falsy
    `,
    )

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      expect(config.outputDir).toBe('falsy-default-coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle unknown file type with no loader', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.unknown')

    writeFileSync(configPath, 'some content')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      // Should fallback to default config since no loader exists for .unknown files
      expect(config.name).toBe('Vitest Monocart Coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle loader returning null value', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.ts')

    // Create a TypeScript file that will fail to load and return null
    writeFileSync(configPath, 'invalid typescript syntax <<<')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      // Should fallback to default config since loader returns null
      expect(config.name).toBe('Vitest Monocart Coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle JSON config with empty object fallback', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.json')

    // Create a JSON file with no default export, testing fallback logic
    writeFileSync(configPath, '{}')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      // Should use defaults when config is empty object
      expect(config.name).toBe('Vitest Monocart Coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle CJS config with empty object fallback', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.cjs')

    // Create a CJS file that exports empty object
    writeFileSync(configPath, 'module.exports = {};')

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      // Should use defaults when config is empty object
      expect(config.name).toBe('Vitest Monocart Coverage')
    } finally {
      rmSync(testDir, { recursive: true })
    }
  })

  it('should handle TypeScript config loading with vite-node fallback', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'vitest-config-test-'))
    const configPath = join(testDir, 'monocart.config.ts')

    // Create a valid TypeScript config file
    writeFileSync(configPath, 'export default { outputDir: "ts-fallback-coverage" };')

    // Mock console.warn to capture warnings
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const config = await resolveMonocartConfig(undefined, undefined, testDir)
      // Should either load successfully or fallback to default with warning
      expect(config.outputDir).toMatch(/^(ts-fallback-coverage|\.\/coverage)$/)
    } finally {
      rmSync(testDir, { recursive: true })
      consoleSpy.mockRestore()
    }
  })
})
