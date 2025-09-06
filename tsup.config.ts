import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: process.env.NODE_ENV === 'development', // Dev-only sourcemaps
  clean: true,
  treeshake: true,
  minify: false,
  target: 'node20',
  external: ['vitest', 'monocart-coverage-reports'],
  outDir: 'dist',
  banner: {
    js: '// vitest-monocart-coverage - Vitest coverage provider for Monocart reporting',
  },
  esbuildOptions: options => {
    options.conditions = ['node']
  },
})
