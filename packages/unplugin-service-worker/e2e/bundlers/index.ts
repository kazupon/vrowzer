import { buildWithVite } from './vite.ts'
import { buildWithRollup } from './rollup.ts'
import { buildWithRolldown } from './rolldown.ts'
import { buildWithWebpack } from './webpack.ts'
import { buildWithRspack } from './rspack.ts'
import { buildWithEsbuild } from './esbuild.ts'
import { buildWithFarm } from './farm.ts'

import type { BundlerConfig } from './types.ts'

export { type BuildResult, type BundlerConfig } from './types.ts'

// Note: Bun bundler is tested separately with `bun test` (see bun.e2e-test.ts)
// because it requires the Bun runtime
export const BUNDLERS: BundlerConfig[] = [
  { name: 'vite', build: buildWithVite },
  { name: 'rollup', build: buildWithRollup },
  { name: 'rolldown', build: buildWithRolldown },
  { name: 'webpack', build: buildWithWebpack },
  { name: 'rspack', build: buildWithRspack },
  { name: 'esbuild', build: buildWithEsbuild },
  { name: 'farm', build: buildWithFarm }
]
