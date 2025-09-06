# @oorabana/vitest-monocart-coverage

[![npm version](https://badge.fury.io/js/@oorabona%2Fvitest-monocart-coverage.svg)](https://badge.fury.io/js/@oorabona%2Fvitest-monocart-coverage)
[![CI](https://github.com/oorabona/vitest-monocart-coverage/actions/workflows/ci.yml/badge.svg)](https://github.com/oorabona/vitest-monocart-coverage/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/oorabona/vitest-monocart-coverage/branch/main/graph/badge.svg)](https://codecov.io/gh/oorabona/vitest-monocart-coverage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18.svg)](https://vitest.dev/)

A Vitest custom coverage provider that integrates Vitest's V8 coverage engine with [Monocart coverage reporting](https://github.com/cenfun/monocart-coverage-reports) for enhanced visualization and features.

## Features

- 🚀 **Direct V8 Integration**: Intercepts raw V8 coverage data before Istanbul conversion
- 📊 **Enhanced Reports**: Beautiful HTML reports with detailed coverage visualization
- ⚡ **In-Memory Processing**: No intermediate files, all data processed in memory
- 🎯 **Zero Data Loss**: Preserves all V8-specific coverage information
- 🔧 **Simple Configuration**: Single Vitest config, no extra setup required
- 📈 **Console Output**: Detailed coverage metrics in terminal
- ✅ **Configuration Validation**: Runtime validation of config files with clear error messages
- 🔄 **Multiple Config Formats**: Supports `.ts`, `.js`, `.mjs`, `.cjs`, and `.json` config files
- 🎨 **Auto-Discovery**: Automatically inherits Vitest's include/exclude patterns

## Why Choose Monocart over V8 Default?

Vitest's default V8 provider has coverage accuracy issues with exception handling and complex code paths. See our [detailed coverage comparison](./docs/coverage-comparison.md) that shows:

- **V8 Default**: 97.56% branch coverage (false negatives in exception paths)
- **Monocart**: 100% branch coverage (accurate real-world coverage)

Read the full analysis: **[Coverage Provider Comparison](./docs/coverage-comparison.md)**

## Installation

```bash
npm install @oorabana/vitest-monocart-coverage
```

## Quick Start

Add the provider to your `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { withMonocartProvider } from '@oorabana/vitest-monocart-coverage'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: withMonocartProvider({
      outputDir: './coverage',
      reports: ['html', 'console-details', 'lcov'],
      name: 'My Project Coverage',
    }),
  },
})
```

That's it! Run `vitest --coverage` and you'll get enhanced coverage reports.

## How It Works

This provider works by intercepting V8 coverage data and enriching it before passing to Monocart:

```mermaid
flowchart LR
    A[Vitest Tests] --> B[V8 Coverage Engine]
    B --> C[Provider Hook<br/>onAfterSuiteRun]
    C --> D[Data Enrichment<br/>+ Source Maps<br/>+ Source Code]
    D --> E[Monocart Reports]
    E --> F[HTML Reports]
    E --> G[Console Output]
    E --> H[LCOV Files]
    
    style A fill:#e1f5fe
    style E fill:#f3e5f5
    style F fill:#e8f5e8
    style G fill:#e8f5e8
    style H fill:#e8f5e8
```

**Key Steps:**
1. **Vitest Configuration**: Automatically sets V8 as coverage engine
2. **Data Interception**: Captures raw coverage before Istanbul transformation
3. **Source Enrichment**: Adds source code and maps from Vite's transform cache
4. **Report Generation**: Delegates to Monocart for multiple output formats

## Advanced Configuration

### Custom Options

```ts
export default defineConfig({
  test: {
    coverage: withMonocartProvider({
      // Basic options
      name: 'My Project Coverage',
      outputDir: './coverage',
      reports: ['html', 'console-details', 'lcov'],
      
      // Advanced options
      sourcePath: 'src',
      sourceFilter: (filePath) => !filePath.includes('node_modules'),
      cleanCache: true,
      logging: 'info',
      
      // Callback after report generation
      onEnd: (results) => {
        console.log('Coverage complete!', results)
      }
    }),
  },
})
```

### External Configuration

You can also use external configuration files. The provider automatically searches for config files in this order:

1. `monocart.config.mjs`
2. `monocart.config.js` 
3. `monocart.config.cjs`
4. `monocart.config.ts`
5. `monocart.config.json`

**monocart.config.ts:**
```ts
export default {
  name: 'My Project Coverage',
  outputDir: './coverage',
  reports: ['html', 'console-details'],
  logging: 'info',
  sourceFilter: (filePath: string) => {
    return !filePath.includes('test') && !filePath.includes('node_modules')
  },
  onEnd: (results) => {
    console.log(`Coverage complete! ${results.summary.statements.pct}% statements covered`)
  }
}
```

**monocart.config.json:**
```json
{
  "name": "JSON Config Example",
  "outputDir": "./coverage",
  "reports": ["html", "lcov"],
  "logging": "warn"
}
```

**vitest.config.ts:**
```ts
import { defineConfig } from 'vitest/config'
import { withMonocartProvider } from '@oorabona/vitest-monocart-coverage'

export default defineConfig({
  test: {
    coverage: withMonocartProvider(), // Will load config file automatically
  },
})
```

### Configuration Validation

The provider validates critical configuration properties at runtime:

- `outputDir` must be a string if provided
- `reports` must be an array if provided  
- `sourceFilter` must be a function if provided
- `logging` must be one of: "debug", "info", "warn", "error"
- `onEnd` must be a function if provided

Invalid configurations will throw clear error messages indicating the expected type and actual value received.

## Configuration Options

All configuration options for the Monocart provider:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | "Vitest Monocart Coverage" | Name displayed in coverage reports |
| `outputDir` | `string` | "./coverage" | Directory where reports will be generated |
| `reports` | `string[]` | ["v8", "console-details"] | Report formats to generate |
| `lcov` | `boolean` | `true` | Generate LCOV format report |
| `sourcePath` | `string` | `undefined` | Source path mapping for reports |
| `sourceFilter` | `function` | `undefined` | Function to filter which files to include |
| `cleanCache` | `boolean` | `true` | Clean cache before generating reports |
| `logging` | `string` | "info" | Logging level: "debug", "info", "warn", "error" |
| `css` | `boolean` | `false` | Enable CSS coverage collection |
| `onEnd` | `function` | `undefined` | Callback executed after report generation |

## Report Types

Available report formats for the `reports` option:

- `'html'`: Interactive HTML report with line-by-line coverage
- `'console-details'`: Detailed console output with coverage metrics
- `'console-summary'`: Summary console output
- `'v8'`: Raw V8 coverage data
- `'lcov'`: LCOV format (also controlled by `lcov` option)

## Vitest Integration

The provider automatically inherits settings from your Vitest configuration:

- **Include/Exclude Patterns**: Uses Vitest's `coverage.include` and `coverage.exclude` for source filtering
- **Output Directory**: Uses Vitest's `coverage.reportsDirectory` if configured
- **Project Name**: Derives coverage name from Vitest's project name
- **Clean Cache**: Inherits from Vitest's `coverage.clean` setting

This ensures seamless integration with your existing Vitest setup while providing enhanced reporting capabilities.

## Documentation

- **[Coverage Provider Comparison](./docs/coverage-comparison.md)** - Detailed analysis of Monocart vs V8 default provider
- **[Release & CI Workflows](./docs/release-workflows.md)** - Complete guide to release processes and GitHub Actions

## Acknowledgments

This project was inspired by [cenfun/vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage). Special thanks to cenfun for the original implementation and inspiration.

### Differences from Original

This implementation differs from the original in several key ways:

- **🔧 Enhanced Configuration**: Runtime validation, multiple config file formats support (`.ts`, `.js`, `.mjs`, `.cjs`, `.json`)
- **🎯 Auto-Discovery**: Automatic inheritance of Vitest's include/exclude patterns and settings
- **✅ Robust Error Handling**: Comprehensive validation with clear error messages and graceful fallbacks
- **🧪 Complete Test Coverage**: 100% branch coverage with extensive edge case testing
- **📚 Modern Architecture**: Dispatch pattern for config loading, improved TypeScript support
- **🛠️ Developer Experience**: Better logging, validation, and integration with Vitest ecosystem

## License

MIT
