# Copilot instructions for vitest-monocart-coverage

This repo implements a custom Vitest coverage provider that enriches V8 coverage and renders reports with Monocart. Use these notes to make accurate, repo-aware changes fast.

## Big picture
- Flow: Vitest (V8) → provider (intercepts onAfterSuiteRun) → enrich sources/maps → reporter → Monocart outputs (HTML / console / LCOV).
- Key modules:
  - `src/config.ts` – external config loading/validation (dispatch by file type), merge with Vitest context, build source filter (picomatch).
  - `src/provider.ts` – core provider; intercepts raw V8 coverage, enriches, delegates to reporter.
  - `src/reporter.ts` – integrates `monocart-coverage-reports`; manages output dir and formats.
  - `src/provider-config.ts` – `withMonocartProvider()` to wire Vitest (Node + Browser modes).
  - `src/browser-provider.ts` / `src/browser-runtime.ts` – browser-specific hooks; optional CSS coverage via CDP.
  - `src/logger.ts` – leveled logging (`debug|info|warn|error`) prefixed `[monocart]`.

## Conventions that matter
- Opinionated V8-only design (no Istanbul instrumentation) for performance; accuracy relies on Vitest AST remapping (see README “Architecture & Why”).
- External config auto-discovery: `monocart.config.mjs` → `.js` → `.cjs` → `.ts` → `.json`.
- Option precedence: custom options > external config > Vitest context > defaults.
- Source filtering inherits Vitest `coverage.include/exclude`; implemented with `picomatch`.
- CSS coverage is ignored in Node; only active in Browser mode.
- Package exports expose Node and Browser entrypoints; use `/browser` with `@vitest/browser`.

## Workflows (Node ≥ 20.19, pnpm)
- Build: `pnpm build` (prod) or `pnpm build:dev` (with source maps). Output: `dist/` via `tsup`.
- Lint/format: `pnpm check` (Biome) or `pnpm check:fix`.
- Typecheck: `pnpm typecheck` (and `:browser`, `:tests`).
- Tests (Node): `pnpm test` or `pnpm test:coverage`.
- Self-coverage: `pnpm test:coverage:self` or `:self:prod` (uses `vitest.self-coverage.config.ts`, reports include `html`, `console-details`, `lcov`).
- Browser coverage: `pnpm test:browser:coverage` or `:browser:coverage:self` (needs `@vitest/browser` + `playwright`).

## Testing specifics
- Vitest: globals, `environment: 'node'`, isolation on, `pool: 'forks'`, 10s test/hook, 5s teardown.
- Coverage thresholds: 90% branches/functions/lines/statements.
- Expected stderr in tests (don’t fail CI): coverage/report errors (error-path tests), vite-node TS config fallback, CI shell noise.

## Extend safely
- Config: add loaders in `config.ts` (regex → loader); keep discovery order; validate with existing checks (zod).
- Provider: extend enrichment/handling in `provider.ts`; keep processing in-memory (no temp files).
- Reporter: add formats in `reporter.ts`; ensure dir management and Monocart API compatibility.
- Types/tests: update `src/types.ts`; mirror with `tests/*.test.ts` and maintain thresholds.

## Minimal examples
- Node: `coverage: withMonocartProvider({ outputDir: './coverage', reports: ['html','console-details','lcov'] })`.
- Browser: `customProviderModule: '@oorabona/vitest-monocart-coverage/browser', customOptions: { css: true }`.

## Pointers
- Reference: `README.md` (architecture rationale, examples), `monocart.config.example.js` (config shape).
- Real configs: `vitest.config.ts`, `vitest.browser.config.ts`, `vitest.self-coverage*.config.ts`.
