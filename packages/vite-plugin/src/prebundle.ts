/**
 * Pre-bundle generated or dedicated Worker config with Rolldown.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, extname, isAbsolute, resolve } from 'node:path'
import { rolldown } from 'rolldown'
import { createDebug } from 'obug'
import { resolveAliases } from './alias.ts'
import { validateWorkerConfigFile } from './worker-config.ts'
import { DEFINE_CONFIG_ID, transformConfigModule } from './worker-config-transform.ts'

import type { Plugin as RolldownPlugin } from 'rolldown'

const debug = createDebug('vite-plugin-vrowzer:prebundle')

export type PrebundleOptions = {
  root: string
  configDir: string
  /** Reports dependencies even if a later load or validation fails. */
  onDependency?: (filename: string) => void
} & (
  | { workerSource: string; sourcePath?: string; workerConfig?: never }
  | { workerConfig: string; workerSource?: never }
)

export interface PrebundleResult {
  path: string
  dependencies: string[]
}

const BUNDLED_FILENAME = 'config.bundled.mjs'

export function resolveOutputDir(root: string): string {
  return resolve(root, 'node_modules', '.vrowzer')
}

export function cleanOutputDir(root: string): void {
  rmSync(resolveOutputDir(root), { recursive: true, force: true })
}

function forbiddenConfigImport(id: string): boolean {
  return ['@vrowzer/vite-plugin', 'vite-plus'].some(
    name => id === name || id.startsWith(`${name}/`)
  )
}

export async function prebundleWorkerConfig(options: PrebundleOptions): Promise<PrebundleResult> {
  const { root, configDir } = options
  const outputDir = resolveOutputDir(root)
  const realOutputDir = existsSync(root) ? resolveOutputDir(realpathSync(root)) : outputDir
  const strict = options.workerConfig !== undefined
  const dependencies = new Set<string>()
  const addDependency = (filename: string) => {
    if (
      !isAbsolute(filename) ||
      [outputDir, realOutputDir].some(dir => filename.startsWith(`${dir}/`))
    ) {
      return
    }
    const normalized = filename.replaceAll('\\', '/')
    dependencies.add(normalized)
    options.onDependency?.(normalized)
  }
  let entryPath: string
  if (options.workerConfig !== undefined) {
    entryPath = options.workerConfig
    addDependency(entryPath)
    validateWorkerConfigFile(entryPath)
  } else {
    mkdirSync(outputDir, { recursive: true })
    entryPath = resolve(outputDir, '_entry.mts')
    writeFileSync(entryPath, options.workerSource)
  }

  const entryModules = new Set([entryPath, realpathSync(entryPath)])
  const localModules = new Set(entryModules)
  const aliases = resolveAliases({ 'node:process': '@vrowzer/node-polyfill/process' })
  const inputPlugin: RolldownPlugin = {
    name: 'vrowzer:worker-config-input',
    async resolveId(id, importer) {
      // Native aliases bypass plugin resolution; keep browser polyfills external explicitly.
      const alias = aliases[id]
      if (alias?.startsWith('@vrowzer/')) {
        return { id: alias, external: true }
      }
      if (!importer || !localModules.has(importer)) {
        return
      }
      const fileReference = id.startsWith('.') || isAbsolute(id)
      const target =
        !strict && fileReference && entryModules.has(importer) ? resolve(configDir, id) : id
      const trackMissingImport = () => {
        if (!fileReference) {
          return
        }
        const filename = resolve(dirname(importer), target)
        addDependency(filename)
        if (!extname(filename)) {
          for (const extension of ['.ts', '.mts', '.js', '.mjs', '.tsx', '.jsx', '.json']) {
            addDependency(`${filename}${extension}`)
            addDependency(resolve(filename, `index${extension}`))
          }
        }
      }
      let resolved
      try {
        resolved = await this.resolve(target, importer, { skipSelf: true })
      } catch (error) {
        trackMissingImport()
        throw error
      }
      if (!resolved) {
        trackMissingImport()
      }
      if (
        resolved &&
        !resolved.external &&
        isAbsolute(resolved.id) &&
        (fileReference || !resolved.id.replaceAll('\\', '/').includes('/node_modules/'))
      ) {
        debug('tracking local config dependency:', resolved.id)
        localModules.add(resolved.id)
        addDependency(resolved.id)
      }
      return resolved
    },
    load(id) {
      if (localModules.has(id)) {
        addDependency(id)
      }
    },
    transform(code, id) {
      if (!isAbsolute(id) || !/\.[cm]?[jt]sx?$/.test(id)) {
        return
      }
      if (localModules.has(id)) {
        debug('transforming local config:', id)
      }
      return transformConfigModule(code, {
        filename: !strict && entryModules.has(id) ? (options.sourcePath ?? id) : id,
        sourceDirectory: !strict && entryModules.has(id) ? configDir : dirname(id),
        local: localModules.has(id),
        strict,
        addDependency
      })
    }
  }

  const bundle = await rolldown({
    input: entryPath,
    external(id) {
      if (strict && forbiddenConfigImport(id)) {
        throw new Error(
          `[vrowzer] Cannot import ${id} in workerConfig ${entryPath}. ` +
            'Use a config object or defineConfig from "vite", without the host Vrowzer plugin.'
        )
      }
      return id.startsWith('@vrowzer/') || id === 'assert' || id === 'v8'
    },
    transform: {
      define: { 'process.env.NODE_ENV': JSON.stringify('development'), global: 'globalThis' },
      inject: { process: '@vrowzer/node-polyfill/process' }
    },
    resolve: {
      alias: aliases,
      mainFields: ['module', 'main'],
      conditionNames: ['browser', 'import', 'default']
    },
    platform: 'neutral',
    plugins: [viteAliasPlugin(), inputPlugin]
  })

  const output = await (async () => {
    try {
      return await bundle.generate({
        format: 'esm',
        entryFileNames: BUNDLED_FILENAME,
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        assetFileNames: 'assets/[name]-[hash][extname]',
        minify: false
      })
    } finally {
      await bundle.close()
    }
  })()

  mkdirSync(outputDir, { recursive: true })
  const temporary = mkdtempSync(resolve(outputDir, '.tmp-'))
  try {
    for (const file of output.output) {
      const staged = resolve(temporary, file.fileName)
      mkdirSync(dirname(staged), { recursive: true })
      writeFileSync(staged, file.type === 'chunk' ? file.code : file.source)
    }
    // Immutable chunk names keep existing Workers valid until the new entry is published.
    const files = output.output.map(file => file.fileName)
    for (const filename of files.filter(filename => filename !== BUNDLED_FILENAME)) {
      const destination = resolve(outputDir, filename)
      mkdirSync(dirname(destination), { recursive: true })
      if (!existsSync(destination)) {
        renameSync(resolve(temporary, filename), destination)
      }
    }
    renameSync(resolve(temporary, BUNDLED_FILENAME), resolve(outputDir, BUNDLED_FILENAME))
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }

  const path = resolve(outputDir, BUNDLED_FILENAME)
  debug('prebundle complete:', path)
  return { path, dependencies: [...dependencies].sort() }
}

function viteAliasPlugin(): RolldownPlugin {
  const internalId = '\0vrowzer:vite-internal-stub'
  return {
    name: 'vrowzer:vite-alias',
    resolveId(id) {
      if (id === DEFINE_CONFIG_ID) {
        return id
      }
      if (id === 'vite') {
        return { id: '@vrowzer/vite-dev-server/vite', external: true }
      }
      if (id === 'vite/internal') {
        return { id: internalId, external: false }
      }
      if (id.startsWith('vite/')) {
        return { id: id.replace(/^vite\//, '@vrowzer/vite-dev-server/vite/'), external: true }
      }
    },
    load(id) {
      if (id === DEFINE_CONFIG_ID) {
        return 'export function defineConfig(config) { return config }'
      }
      if (id === internalId) {
        return 'export {}'
      }
    }
  }
}
