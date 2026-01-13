import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/api.ts',
    'src/esbuild.ts',
    'src/farm.ts',
    'src/index.ts',
    'src/rspack.ts',
    'src/webpack.ts',
    'src/vite.ts',
    'src/rollup.ts',
    'src/rolldown.ts'
  ],
  clean: true,
  publint: true,
  dts: true
})
