import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: [
      'src/api.ts',
      'src/bun.ts',
      'src/esbuild.ts',
      'src/farm.ts',
      'src/index.ts',
      'src/rspack.ts',
      'src/webpack.ts',
      'src/vite.ts',
      'src/rollup.ts',
      'src/rolldown.ts'
    ],
    external: [
      '@farmfe/core',
      '@rspack/core',
      'esbuild',
      'rolldown',
      'rollup',
      'unplugin',
      'vite',
      'webpack'
    ],
    clean: true,
    publint: true,
    dts: true
  }
})
