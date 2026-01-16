import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'

import type { BuildResult } from './types.ts'

// Use built dist module instead of source
const ServiceWorker = (await import('../../dist/webpack.mjs')).default

export async function buildWithWebpack(
  playgroundDir: string,
  outputDir: string
): Promise<BuildResult> {
  return new Promise((resolve, reject) => {
    webpack(
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
          new HtmlWebpackPlugin({
            template: join(playgroundDir, 'index.html'),
            inject: 'body',
            scriptLoading: 'module'
          }),
          ServiceWorker()
        ]
      },
      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- for testing
      async (err, stats) => {
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
