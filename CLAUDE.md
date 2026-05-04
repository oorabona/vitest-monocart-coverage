# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project creates a custom Vitest coverage plugin that connects Vitest to Monocart coverage reporting, written in TypeScript.

## Development Commands

- `pnpm check:fix` - Format and auto-fix with Biome
- `pnpm check` - Run lint + format checks with Biome
- `pnpm test` - Run tests with Vitest
- `pnpm build` - Build the project with tsup
- `pnpm release-it-preset update` - Update changelog for release
- `node node_modules/@oorabona/release-it-preset/dist/scripts/extract-changelog.js <version>` - Extract changelog for release

## Code Architecture

### Build Configuration
- **tsup.config.ts**: Builds both CommonJS and ESM formats from `src/index.ts`
- **Target**: Node.js 20.19+
- **External dependencies**: `vitest`, `monocart-coverage-reports`
- **Output**: `dist/` directory with conditional source maps (dev-only) and TypeScript declarations
- **Production**: `pnpm build` - No source maps (362KB package)
- **Development**: `pnpm build:dev` - With source maps for debugging

### TypeScript Configuration
- **Strict mode enabled** with comprehensive type checking
- **Module system**: NodeNext with modern ES2022 target
- **Path aliases**: `@oorabona/vitest-monocart-coverage` maps to `src/index.ts`
- **Source directory**: `src/`
- **Test files**: `tests/**/*.test.ts` (excluded from build)

### Testing Setup
- **Vitest** with Node.js environment and global test APIs
- **Coverage**: V8 provider with 90% threshold requirements (branches, functions, lines, statements)
- **Test isolation**: Enabled with fork pool
- **Timeouts**: 10s test, 10s hooks, 5s teardown
- **Self-Coverage**: `vitest.self-coverage.config.ts` achieves 100% branch coverage using Monocart provider
- **Error Testing**: Comprehensive error handling tests for edge cases and fallbacks

### Code Quality
- **Biome**: Linting and formatting with strict rules
- **Formatting**: 2-space indentation, single quotes, trailing commas
- **Pre-commit hooks**: Auto-format and lint on staged files via nano-staged

### Project Structure
```
src/           # Source code (TypeScript)
tests/         # Test files (*.test.ts)
dist/          # Built output (generated)
scripts/       # Build and release scripts
```

The plugin should integrate Vitest's coverage system with Monocart's reporting capabilities while maintaining type safety and following the established coding standards.

## Implementation Details

### Configuration System (`src/config.ts`)

The configuration system uses a **dispatch pattern** with Map-based loader registry for different config file formats:

```typescript
type ConfigLoader = (configPath: string) => Promise<unknown>

const configLoaders = new Map<RegExp, ConfigLoader>([
  [/\.json$/, async (configPath) => { /* JSON import with type assertion */ }],
  [/\.cjs$/, async (configPath) => { /* CommonJS require via createRequire */ }],
  [/\.m?js$/, async (configPath) => { /* ESM dynamic import */ }],
  [/\.ts$/, async (configPath) => { /* TypeScript with vite-node fallback */ }]
])
```

**Key Features:**
- **Runtime Validation**: `validateExternalConfig()` validates critical properties with detailed error messages
- **Auto-Discovery**: Searches config files in priority order: `.mjs` → `.js` → `.cjs` → `.ts` → `.json`
- **Vitest Integration**: Inherits include/exclude patterns and creates sourceFilter automatically
- **Source Filtering**: `createSourceFilter()` uses picomatch for glob pattern matching
- **Error Handling**: Graceful fallbacks for TypeScript loading via vite-node

**Configuration Priority:**
1. Custom options (highest)
2. External config files 
3. Vitest context settings
4. Default configuration (lowest)

### Provider System (`src/provider.ts`)

The core provider extends Vitest's BaseCoverageProvider with custom hooks:

- **`onAfterSuiteRun`**: Intercepts raw V8 coverage data before Istanbul transformation
- **Data Enrichment**: Adds source code and source maps from Vite's transform cache
- **Memory Processing**: All operations in-memory without temporary files
- **Error Handling**: Comprehensive error logging with graceful degradation

### Provider Configuration (`src/provider-config.ts`)

Helper functions for Vitest configuration integration:

- **`withMonocartProvider()`**: Main entry point that configures Vitest to use V8 + custom provider
- **`isViteConfig()`**: Type guard for Vite configuration detection
- **`createCoverageConfig()`**: Merges custom options with Vitest defaults

### Coverage Reporting (`src/reporter.ts`)

Monocart integration layer:

- **Report Generation**: Delegates to Monocart Coverage Reports library
- **Output Management**: Handles output directory creation and cleanup
- **Format Support**: HTML, console, LCOV, and raw V8 formats

### Logging System (`src/logger.ts`)

Structured logging with configurable levels:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'
```

- **Level-based filtering**: Only logs at or above configured level
- **Consistent formatting**: `[monocart] Message` prefix
- **Context awareness**: Uses config logging level with fallback

## Testing Strategy

### Coverage Target: 100% Branches
- **config.ts**: Achieved through comprehensive edge case testing
- **Error Scenarios**: Tests for invalid configs, missing files, loader failures
- **Integration Tests**: Full Vitest + Monocart workflow validation
- **Mocking Strategy**: Strategic mocks for external dependencies (Monocart, Vitest APIs)

### Test Organization
- **Unit Tests**: Each source file has corresponding `.test.ts`
- **Integration Tests**: `full-coverage.test.ts` validates complete workflows
- **Error Handling**: Specific tests for each error condition and fallback
- **Configuration Loading**: Tests for all supported config formats and validation

### Expected stderr Messages
The following stderr messages during testing are **normal and expected**:

- `Failed to generate Monocart coverage report` - Error handling test
- `Failed to process coverage` - Coverage error simulation
- `Failed to load TS config via vite-node` - TypeScript fallback testing
- `bind: warning: line editing not enabled` - Non-interactive shell environment
- `bleopt: command not found` - oh-my-posh configuration in CI context

## Development Commands (Extended)

- `pnpm exec vitest run --config vitest.self-coverage.config.ts` - Self-coverage analysis
- `pnpm coverage` - Standard coverage with V8 provider
- `pnpm test:coverage:self` - Self-dogfooding with Monocart provider
- `pnpm check && pnpm typecheck` - Full code quality validation