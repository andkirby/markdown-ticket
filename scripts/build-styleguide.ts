#!/usr/bin/env bun
/** Bundle production styleguide components for raw HTML preview without a dev server. */
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { build } from 'vite'

const frontend = fileURLToPath(new URL('../frontend/', import.meta.url))
const source = fileURLToPath(new URL('../frontend/src/', import.meta.url))

await build({
  configFile: false,
  root: frontend,
  publicDir: false,
  base: './',
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: {
    alias: {
      '@': source,
      '@mdt/shared': fileURLToPath(new URL('../shared/dist/', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: `${frontend}tailwind.config.js` }), autoprefixer()],
    },
  },
  build: {
    outDir: `${source}styleguide/dist`,
    emptyOutDir: true,
    copyPublicDir: false,
    cssCodeSplit: false,
    watch: process.argv.includes('--watch') ? {} : null,
    lib: {
      entry: `${source}styleguide/externalReferences.tsx`,
      name: 'MDTStyleguide',
      formats: ['iife'],
      fileName: () => 'externalReferences.js',
      cssFileName: 'externalReferences',
    },
  },
})
