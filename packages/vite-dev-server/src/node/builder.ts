/**
 * Build Worker entry point for @vrowzer/vite-dev-server
 *
 * vrowzer-only module, not in upstream Vite. It builds a snapshot of the project files with
 * upstream's `build()`, in the build Worker of vrowzer. The files are written to the virtual file
 * system of the Worker, built with `write: false`, and returned as a map of the outputs.
 *
 * @module node/builder
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

// The order of the imports matters:
// - `./builderGlobals` sets the globals that the rolldown binding reads when it is initialized,
//   so it must come first.
// - `./config` must be evaluated before `./build`. The two modules import each other, and
//   `config.ts` uses the build defaults while it is evaluated (the transformer entry has the same
//   order). In the other order, the bundle fails with "Cannot access ... before initialization".
import './builderGlobals'
import { fs, vol } from '@vrowzer/fs'
import './config'
import { build } from './build'
import {
  addPublicFiles,
  checkChunkSizes,
  collectOutputs,
  createBuildLogPlugin,
  createBuildOptionsPlugin,
  createCollectingLogger,
  createUnsupportedFeaturesPlugin,
  toBuildProjectError,
} from './builderUtils'

import type { BuildProjectLog, BuildProjectResult } from './builderUtils'
import type { InlineConfig, ResolvedConfig } from './config'

export { BuildProjectError } from './builderUtils'
export type { BuildProjectLog, BuildProjectResult } from './builderUtils'
export type { InlineConfig } from './config'
export { mergeConfig } from './utils'

function writeSnapshot(files: Record<string, string | ArrayBuffer>): void {
  vol.reset()
  for (const [filePath, content] of Object.entries(files)) {
    const dir = filePath.slice(0, filePath.lastIndexOf('/'))
    if (dir) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, typeof content === 'string' ? content : new Uint8Array(content))
  }
}

/**
 * Build the project files with Vite, without writing the outputs.
 *
 * The builder decides some options over `inlineConfig`: `root` is `/`, `configFile` is `false`,
 * `build.write` and `build.emptyOutDir` are `false`, and `logLevel` is `warn`, because the result
 * has the warnings and errors only. Options that the browser build does not support are rejected.
 *
 * @param files - The project files, keyed by absolute path
 * @param inlineConfig - The Vite config: the Worker config and the options of the build, merged
 * @returns The outputs and the warnings
 * @throws {@link BuildProjectError} when the build fails
 */
export async function buildProject(
  files: Record<string, string | ArrayBuffer>,
  inlineConfig: InlineConfig = {}
): Promise<BuildProjectResult> {
  const warnings: BuildProjectLog[] = []
  const state: { config?: ResolvedConfig } = {}
  writeSnapshot(files)
  try {
    const result = await build({
      ...inlineConfig,
      root: '/',
      configFile: false,
      logLevel: 'warn',
      customLogger: createCollectingLogger(warnings),
      plugins: [
        ...(inlineConfig.plugins ?? []),
        createBuildOptionsPlugin(state),
        createBuildLogPlugin(warnings),
        createUnsupportedFeaturesPlugin(),
      ],
      build: {
        ...inlineConfig.build,
        write: false,
        emptyOutDir: false,
      },
    })
    const outputs = collectOutputs(result)
    if (state.config) {
      addPublicFiles(outputs, files, state.config)
      const largeChunks = checkChunkSizes(result, state.config.build)
      if (largeChunks) {
        warnings.push(largeChunks)
      }
    }
    return { files: outputs, warnings }
  } catch (error) {
    throw toBuildProjectError(error)
  } finally {
    // The build Worker closes after a build, but do not keep the snapshot in any case
    vol.reset()
  }
}
