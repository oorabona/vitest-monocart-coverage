import { defineConfig } from 'tsup'

export default defineConfig([
  // Main Node.js build
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: process.env.NODE_ENV === 'development',
    clean: true,
    treeshake: true,
    minify: false,
    target: 'node21',
    external: ['vitest', 'monocart-coverage-reports'],
    outDir: 'dist',
    banner: {
      js: '// vitest-monocart-coverage - Vitest coverage provider for Monocart reporting',
    },
    esbuildOptions: options => {
      options.conditions = ['node']
    },
  },
  // Browser provider build (pure browser interface, keep dependencies external)
  {
    entry: { browser: 'src/browser.ts' },
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: process.env.NODE_ENV === 'development',
    clean: false,
    treeshake: true,
    minify: false,
    target: 'esnext', // Browser target
    platform: 'browser',
    external: [
      // Keep all internal modules external so they load dynamically
      './browser-provider.js',
      './browser-runtime.js',
      // External deps
      'vitest',
      'monocart-coverage-reports',
      'magicast',
      'istanbul-lib-coverage',
      'fs',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:url',
      'node:module',
    ],
    outDir: 'dist',
    esbuildOptions: options => {
      options.conditions = ['browser']
      // options.sourcesContent = true // Include source content in sourcemaps for better mapping
    },
  },
  // Browser provider build (for Node.js context imports)
  {
    entry: { 'browser-provider': 'src/browser-provider.ts' },
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: process.env.NODE_ENV === 'development',
    clean: false,
    treeshake: true,
    minify: false,
    target: 'node21', // Node.js target
    platform: 'node',
    external: ['vitest', 'monocart-coverage-reports', 'node:fs', 'node:path', 'node:url'],
    outDir: 'dist',
    esbuildOptions: options => {
      options.conditions = ['node']
    },
  },
  // Browser runtime build (runs in actual browser environment)
  {
    entry: { 'browser-runtime': 'src/browser-runtime.ts' },
    format: ['esm'],
    dts: {
      compilerOptions: {
        lib: ['DOM', 'ES2022'], // Add DOM lib for window global
      },
    },
    splitting: false,
    sourcemap: process.env.NODE_ENV === 'development',
    clean: false,
    treeshake: true,
    minify: false,
    target: 'esnext', // Modern browser target
    platform: 'browser', // Browser platform
    external: [], // No externals for browser runtime
    outDir: 'dist',
    esbuildOptions: options => {
      options.conditions = ['browser']
      // Ensure browser environment
      options.define = {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      }
    },
  },
])
