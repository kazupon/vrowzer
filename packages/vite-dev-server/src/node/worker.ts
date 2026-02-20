/**
 * Web Worker entry point for @vrowser/vite-dev-server
 *
 * This module exports everything needed to run DevEnvironment,
 * PluginContainer, ModuleGraph, transform pipeline, HMR computation,
 * and DepsOptimizer inside a Web Worker.
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { isResolvedConfig, resolveConfig } from './config'
import { initPublicFiles } from './publicDir'

import type { InlineConfig, ResolvedConfig } from './config'
import type { DevEnvironment } from './server/environment'

export interface SetupWorkerOptions {
  /**
   * Base path for the Vite Dev Server routes.
   * All routes will be prefixed with this path.
   *
   * @example '/__preview__' - Server handles /__preview__/* requests
   * @default '/'
   */
  basePath?: string
  /**
   * @internal
   */
  previousEnvironments?: Record<string, DevEnvironment>
}

// Lazily load @vrowser/rolldown to avoid top-level await.
// rolldown's WASM init uses top-level await which is incompatible with
// IIFE output format used by Vite's worker bundler and Service Worker bundler.
let rolldownPromise: Promise<{
  rolldown: typeof import('@vrowser/rolldown').rolldown
  memfs: NonNullable<typeof import('@vrowser/rolldown/experimental').memfs>
  fs: typeof import('@vrowser/fs').fs
}> | null = null

function loadRolldown() {
  if (!rolldownPromise) {
    rolldownPromise = (async () => {
      const [{ rolldown }, { memfs }, { fs }] = await Promise.all([
        import('@vrowser/rolldown'),
        import('@vrowser/rolldown/experimental'),
        import('@vrowser/fs')
      ])
      return { rolldown, memfs: memfs!, fs }
    })()
  }
  return rolldownPromise
}

export async function setupWorker(
  inlineConfig: InlineConfig | ResolvedConfig = {
    base: '/',
    publicDir: 'public',
    experimental: {
      importGlobRestoreExtension: false,
      renderBuiltUrl: () => undefined,
      hmrPartialAccept: false,
      enableNativePlugin: 'v2',
      bundledDev: false,
    }
  },
  options: SetupWorkerOptions = {},
) {
  const config = isResolvedConfig(inlineConfig)
    ? inlineConfig
    : await resolveConfig(inlineConfig, 'serve')
  console.log('[vrowser-worker] vrower web worker config:', config)

  const initPublicFilesPromise = initPublicFiles(config)

  const { root } = config
  const basePath = options.basePath || '/'
}

export async function bundle(files: Record<string, string>, input: string): Promise<[string, string]> {
  const { rolldown, memfs, fs } = await loadRolldown()

  console.log('[Rolldown Worker] bundling', input)

  memfs.volume.reset()
  memfs.volume.fromJSON(files)

  fs.mkdirSync('/node_modules', { recursive: true })
  console.log('[Rolldown Worker on @vrowser/rolldown memfs] virtual files:', memfs.fs.readdirSync('/'))
  console.log('[Rolldown Worker on @vrowser/fs memfs] virtual file content:', fs.readdirSync('/'))

  const bundle = await rolldown({ input, cwd: '/' })
  const { output } = await bundle.generate({ format: 'esm' })

  return [output[0].code, output[0].fileName]
}

// === DevEnvironment ===
export { DevEnvironment } from './server/environment'
export type { DevEnvironmentContext } from './server/environment'

// === Plugin Container ===
export {
  basePluginContextMeta, BasicMinimalPluginContext, createEnvironmentPluginContainer,
  createPluginContainer,
  ERR_CLOSED_SERVER,
  throwClosedServerError
} from './server/pluginContainer'
export type {
  EnvironmentPluginContainer,
  PluginContainer
} from './server/pluginContainer'

// === Module Graph ===
export {
  EnvironmentModuleGraph,
  EnvironmentModuleNode
} from './server/moduleGraph'
export type { ResolvedUrl } from './server/moduleGraph'

// === Transform pipeline ===
export {
  ERR_DENIED_ID, ERR_LOAD_PUBLIC_URL, ERR_LOAD_URL, getModuleTypeFromId, transformRequest
} from './server/transformRequest'
export type {
  TransformOptions,
  TransformOptionsInternal, TransformResult
} from './server/transformRequest'

// === HMR computation ===
export {
  createServerHotChannel, getShortName, handlePrunedModules,
  lexAcceptedHmrDeps,
  lexAcceptedHmrExports,
  normalizeHmrUrl, normalizeHotChannel, updateModules
} from './server/hmr'
export type {
  HmrContext, HmrOptions, HotChannel,
  HotChannelClient,
  HotChannelListener, HotUpdateOptions, NormalizedHotChannel,
  NormalizedHotChannelClient, NormalizedServerHotChannel, ServerHotChannel, ServerHotChannelApi
} from './server/hmr'

// === MessageChannel HMR server ===
export {
  createMessageChannelServer,
  isMessageChannelServer
} from './server/ws'
export type {
  MessageChannelClient,
  MessageChannelCustomListener, MessageChannelServer
} from './server/ws'

// === HTML transform ===
export { createDevHtmlTransformFn } from './server/middlewares/indexHtml'

// === Optimizer ===
export {
  isDepOptimizationDisabled
} from './optimizer'
export type {
  DepOptimizationConfig,
  DepOptimizationMetadata,
  DepOptimizationOptions, DepsOptimizer, ExportsData,
  OptimizedDepInfo
} from './optimizer'
export {
  createDepsOptimizer,
  createExplicitDepsOptimizer
} from './optimizer/optimizer'

// === Config ===
export { defineConfig, resolveConfig } from './config'
export type {
  DevEnvironmentOptions, EnvironmentOptions, InlineConfig, ResolvedConfig, ResolvedDevEnvironmentOptions, ResolvedEnvironmentOptions
} from './config'

// === BaseEnvironment ===
export { BaseEnvironment } from './baseEnvironment'
export type { Environment } from './environment'

// === Plugin types ===
export type { MinimalPluginContextWithoutEnvironment } from './plugin'

// === Logger ===
export { createLogger } from './logger'
export type { Logger, LogLevel, LogType } from './logger'

// === Sourcemap ===
export {
  applySourcemapIgnoreList,
  extractSourcemapFromFile,
  injectSourcesContent
} from './server/sourcemap'

// === Warmup ===
export { warmupFiles } from './server/warmup'

// === Backward compatibility ===
export { ModuleGraph } from './server/mixedModuleGraph'
export type { ModuleNode } from './server/mixedModuleGraph'

// === HMR payload types ===
export type {
  CustomEventMap,
  InferCustomEventPayload,
  InvalidatePayload
} from '#types/customEvent'
export type {
  ConnectedPayload,
  CustomPayload,
  ErrorPayload,
  FullReloadPayload,
  HMRPayload,
  HotPayload,
  PrunePayload,
  Update,
  UpdatePayload
} from '#types/hmrPayload'

