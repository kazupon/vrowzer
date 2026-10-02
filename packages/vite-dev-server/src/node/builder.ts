/**
 * Build Worker entry point for @vrowzer/vite-dev-server
 *
 * SPIKE (#36): builds a snapshot of the project files with Vite's build pipeline, in a dedicated
 * Web Worker. The files are written to this Worker's virtual filesystem, built with `write: false`,
 * and the outputs are returned as a file map.
 *
 * @module node/builder
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

// Must be the first import: sets globals before the rolldown binding is initialized
import './builderGlobals'
import { fs, vol } from '@vrowzer/fs'
// Evaluate config.ts before build.ts: config.ts reads the build defaults at module evaluation, and
// the two modules import each other (the transformer entry has the same order)
import './config'
import { build } from './build'
import { createLogger } from './logger'

import type { RolldownOutput } from 'rolldown'
import type { InlineConfig } from './config'
import type { Logger } from './logger'

export interface BuildProjectLog {
  message: string
  code?: string
  plugin?: string
  id?: string
  loc?: { line: number; column: number; file?: string }
  frame?: string
}

export interface BuildProjectResult {
  files: Record<string, string | ArrayBuffer>
  warnings: BuildProjectLog[]
  timings: { write: number; build: number; collect: number }
}

function writeSnapshot(files: Record<string, string | ArrayBuffer>): void {
  vol.reset()
  for (const [path, content] of Object.entries(files)) {
    const dir = path.substring(0, path.lastIndexOf('/'))
    if (dir) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (typeof content === 'string') {
      fs.writeFileSync(path, content, { encoding: 'utf8' })
    } else {
      fs.writeFileSync(path, new Uint8Array(content))
    }
  }
}

function createCollectingLogger(warnings: BuildProjectLog[]): Logger {
  const logger = createLogger('warn', { allowClearScreen: false })
  return {
    ...logger,
    warn(msg, options) {
      warnings.push({ message: msg })
      logger.warn(msg, options)
    },
    warnOnce(msg, options) {
      warnings.push({ message: msg })
      logger.warnOnce(msg, options)
    },
  }
}

function toArrayBuffer(source: Uint8Array): ArrayBuffer {
  return source.byteOffset === 0 && source.byteLength === source.buffer.byteLength
    ? (source.buffer as ArrayBuffer)
    : (source.slice().buffer as ArrayBuffer)
}

/**
 * Build the project files with Vite, without writing the outputs.
 *
 * @param files - The project files, keyed by absolute path
 * @param inlineConfig - The Vite config: the Worker config and the build options merged
 */
export async function buildProject(
  files: Record<string, string | ArrayBuffer>,
  inlineConfig: InlineConfig,
): Promise<BuildProjectResult> {
  const warnings: BuildProjectLog[] = []
  const t0 = performance.now()
  writeSnapshot(files)
  const t1 = performance.now()
  try {
    const result = await build({
      ...inlineConfig,
      root: '/',
      configFile: false,
      customLogger: createCollectingLogger(warnings),
      build: {
        ...inlineConfig.build,
        write: false,
        emptyOutDir: false,
        watch: null,
      },
    })
    const t2 = performance.now()
    const outputs = (Array.isArray(result) ? result : [result]) as RolldownOutput[]
    const out: Record<string, string | ArrayBuffer> = {}
    for (const output of outputs) {
      for (const item of output.output) {
        if (item.type === 'chunk') {
          out[item.fileName] = item.code
        } else {
          out[item.fileName] =
            typeof item.source === 'string' ? item.source : toArrayBuffer(item.source)
        }
      }
    }
    // vrowzer: Vite copies the public directory only when it writes the bundle (prepareOutDir), so
    // add the public files of the snapshot to the result
    if (inlineConfig.build?.copyPublicDir !== false) {
      const publicDir = `/${(inlineConfig.publicDir === undefined ? 'public' : inlineConfig.publicDir || '').replace(/^\/|\/$/g, '')}/`
      for (const [path, content] of Object.entries(files)) {
        if (publicDir === '//' || !path.startsWith(publicDir)) {
          continue
        }
        const fileName = path.slice(publicDir.length)
        if (Object.hasOwn(out, fileName)) {
          throw new Error(`[vrowzer] The public file ${path} collides with the build output ${fileName}`)
        }
        out[fileName] = typeof content === 'string' ? content : content.slice(0)
      }
    }
    const t3 = performance.now()
    return { files: out, warnings, timings: { write: t1 - t0, build: t2 - t1, collect: t3 - t2 } }
  } finally {
    // Do not keep the snapshot while the Worker waits for the next build
    vol.reset()
  }
}

export { fs, vol }
