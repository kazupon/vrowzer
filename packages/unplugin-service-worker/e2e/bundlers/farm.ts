import { join } from 'node:path'
import { build } from '@farmfe/core'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/farm.mjs')).default

export async function buildWithFarm(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  await build({
    root: playgroundDir,
    compilation: {
      input: {
        index: join(playgroundDir, 'index.html')
      },
      output: {
        path: outputDir,
        publicPath: '/',
        filename: 'assets/[name]-[hash].[ext]',
        assetsFilename: 'assets/[name]-[hash].[ext]'
      },
      minify: false,
      sourcemap: false,
      persistentCache: false
    },
    // @ts-ignore -- for testing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- for testing
    plugins: [ServiceWorker()]
  })

  return { success: true }
}
