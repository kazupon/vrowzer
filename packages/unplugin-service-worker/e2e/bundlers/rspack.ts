import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { rspack, HtmlRspackPlugin } from '@rspack/core'

import type { Stats } from '@rspack/core'
import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/rspack.mjs')).default

export async function buildWithRspack(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  return new Promise((resolve, reject) => {
    rspack(
      {
        mode: 'production',
        entry: join(playgroundDir, 'main.js'),
        output: {
          path: outputDir,
          filename: 'assets/[name]-[contenthash:8].js',
          chunkFilename: 'assets/[name]-[contenthash:8].js',
          clean: true,
          publicPath: '/'
        },
        resolve: {
          extensions: ['.js', '.ts'],
          conditionNames: ['browser', 'import', 'module', 'default']
        },
        optimization: {
          minimize: false
        },
        plugins: [
          new HtmlRspackPlugin({
            template: join(playgroundDir, 'index.html'),
            inject: 'body',
            scriptLoading: 'module'
          }),
          ServiceWorker()
        ]
      },
      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- for testing
      async (err: Error, stats: Stats) => {
        if (err) {
          reject(err)
          return
        }

        if (stats?.hasErrors()) {
          const info = stats.toJson()
          reject(new Error(info.errors?.map(e => e.message).join('\n')))
          return
        }

        // Copy CSS
        try {
          await copyFile(join(playgroundDir, 'style.css'), join(outputDir, 'style.css'))
          resolve({ success: true })
        } catch (copyErr) {
          reject(copyErr as Error)
        }
      }
    )
  })
}
