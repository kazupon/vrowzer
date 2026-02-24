/**
 * Web Worker entry point for @vrowser/vite-dev-server
 *
 * This module exports everything needed to run DevEnvironment,
 * PluginContainer, ModuleGraph, transform pipeline, HMR computation,
 * and DepsOptimizer inside a Web Worker.
 *
 * @module node/transformer
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { fs, vol } from '@vrowser/fs'
import { rolldown } from '@vrowser/rolldown'
import { memfs } from '@vrowser/rolldown/experimental'
import { createBirpc } from 'birpc'
import { isResolvedConfig, resolveConfig } from './config'
import { initPublicFiles } from './publicDir'
import { DevEnvironment } from './server/environment'
import { checkLoadingAccess } from './server/middlewares/static'
import { createMessageChannelServer } from './server/ws'
import { createDebugger } from './utils'
import {
  createNoopWatcher,
  getResolvedOutDirs,
  resolveChokidarOptions,
  resolveEmptyOutDir
} from './watch'

import type { BirpcReturn } from 'birpc'
import type { WebWorkerHmrPortMessage, WebWorkerServiceWorkerChannelReadyMessage } from '../shared/messages'
import type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'
import type { InlineConfig, ResolvedConfig } from './config'
import type { ViteDevServer } from './server/index'

const debug = createDebugger('vrowser:transformer')

/**
 * Subset of ViteDevServer for Web Worker environment.
 *
 * The full ViteDevServer includes SW-specific properties (middlewares, httpServer, etc.)
 * that are not available in the Web Worker. This type picks only the properties
 * needed by Environment APIs (warmupFiles, createDevHtmlTransformFn, etc.).
 */
export type ViteDevServerForWorker = Pick<ViteDevServer,
  | 'config'
  | 'environments'
  | 'transformRequest'
  | 'warmupRequest'
  | 'transformIndexHtml'
>

/**
 * Result of {@link setupWorker} initialization.
 */
export interface SetupWorkerResult {
  config: ResolvedConfig
  environments: Record<string, DevEnvironment>
  ws: import('./server/ws').MessageChannelServer
}

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

const urlRE = /[?&]url\b/
const rawRE = /[?&]raw\b/
const inlineRE = /[?&]inline\b/
const svgRE = /\.svg\b/

export function isServerAccessDeniedForTransform(config: ResolvedConfig, id: string) {
  if (rawRE.test(id) || urlRE.test(id) || inlineRE.test(id) || svgRE.test(id)) {
    return checkLoadingAccess(config, id) !== 'allowed'
  }
  return false
}

/**
 * Initialize the Web Worker server and DevEnvironment.
 *
 * Waits for `V_WW_SETUP` message from Main Thread, dynamically imports the transformer module to load rolldown + DevEnvironment,
 * resolves config, initializes DevEnvironment, and sends `V_WW_SETUP_ACK`.
 * After `setupWorker()` resolves, `V_SW_CONNECT_PORT` messages are automatically handled for birpc channel establishment.
 *
 * @param inlineConfig - Vite config object or resolved config
 * @param options - Setup options for the worker
 */
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
  files?: Record<string, string>,
): Promise<SetupWorkerResult> {
  const config = isResolvedConfig(inlineConfig)
    ? inlineConfig
    : await resolveConfig(inlineConfig, 'serve')
  debug?.('config:', config)

  setupVirtualFiles(files)

  const initPublicFilesPromise = initPublicFiles(config)

  const { root } = config
  const basePath = options.basePath || '/'

  const resolvedOutDirs = getResolvedOutDirs(
    config.root,
    config.build.outDir,
    config.build.rollupOptions.output,
  )
  const emptyOutDir = resolveEmptyOutDir(
    config.build.emptyOutDir,
    config.root,
    resolvedOutDirs,
  )

  const resolvedWatchOptions = resolveChokidarOptions(
    {
      disableGlobbing: true,
      // ...serverConfig.watch,
    },
    resolvedOutDirs,
    emptyOutDir,
    config.cacheDir,
  )

  // Create MessageChannel server for HMR
  const ws = createMessageChannelServer(config)

  // Initialize public directory and files
  const publicFiles = await initPublicFilesPromise
  const { publicDir } = config
  debug?.('publicDir:', publicDir, 'publicFiles:', publicFiles)

  // Create a watcher that DevEnvironment can use for file watching (e.g. for plugins that watch files).
  const watcher = createNoopWatcher(resolvedWatchOptions)

  // Create DevEnvironment for each configured environment
  const environments: Record<string, DevEnvironment> = {}
  await Promise.all(
    Object.entries(config.environments).map(
      async ([name, environmentOptions]) => {
        const environment = await environmentOptions.dev.createEnvironment(
          name,
          config,
          {
            ws,
          },
        )
        environments[name] = environment

        const previousInstance =
          options.previousEnvironments?.[environment.name]
        await environment.init({ watcher, previousInstance })
        // Start HMR channel listening (equivalent to environment.listen() but without ViteDevServer)
        environment.hot.listen()
      },
    ),
  )
  debug?.('Created environments:', environments)

  return { config, environments, ws }
}

function setupVirtualFiles(files?: Record<string, string>): void {
  fs.mkdirSync('/public', { recursive: true })
  fs.writeFileSync('/public/.gitkeep', '', { encoding: 'utf8' })
  fs.writeFileSync(
    '/index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <div id="app"><p>Loading...</p></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
    { encoding: 'utf8' }
  )

  if (files) {
    updateFiles(files)
  }

  debug?.('virtual file system initialized', vol.toTree())
}

/**
 * Connect a MessagePort from the Service Worker and establish birpc RPC.
 *
 * Performs the V_WW_SW_CHANNEL_READY handshake on the port, then
 * creates a birpc RPC server that handles transform requests from the SW.
 *
 * After birpc is established, the same port is also used to receive
 * V_WW_HMR_PORT messages (iframe HMR ports forwarded from SW).
 *
 * @param port - MessagePort received via V_SW_CONNECT_PORT message
 * @param handlers - WorkerFunctions handlers (transformRequest, transformIndexHtml)
 * @param onHmrPort - Callback when an iframe HMR port is received via V_WW_HMR_PORT
 * @returns Promise that resolves with the birpc instance after handshake completes
 */
export function connectServiceWorkerPort(
  port: MessagePort,
  handlers: WorkerFunctions,
  onHmrPort?: (port: MessagePort, clientId?: string) => void,
): Promise<BirpcReturn<ServiceWorkerFunctions, WorkerFunctions>> {
  return new Promise((resolve) => {
    // Phase 1: Handshake — wait for SW's channel-ready before creating birpc
    port.onmessage = (e: MessageEvent<WebWorkerServiceWorkerChannelReadyMessage>) => {
      if (e.data.type === 'V_WW_SW_CHANNEL_READY' && e.data.source === 'sw') {
        debug?.('SW channel ready, creating birpc')

        // Phase 2: Replace onmessage with birpc + HMR port intercept
        const rpc = createBirpc<ServiceWorkerFunctions, WorkerFunctions>(
          handlers,
          {
            post: data => port.postMessage(data),
            on: fn => {
              port.onmessage = (ev: MessageEvent<WebWorkerHmrPortMessage>) => {
                // Intercept: HMR port forwarded from SW
                if (ev.data.type === 'V_WW_HMR_PORT' && ev.ports?.[0]) {
                  debug?.('HMR port received from SW', ev.data.clientId)
                  onHmrPort?.(ev.ports[0], ev.data.clientId)
                  return
                }
                // Normal birpc message
                fn(ev.data)
              }
            },
          }
        )

        resolve(rpc)
      }
    }

    // Send WW's channel-ready first
    port.postMessage({ type: 'V_WW_SW_CHANNEL_READY', source: 'ww' })
  })
}

/**
 * Update a file in the virtual filesystem (@vrowser/fs).
 *
 * This ensures the file is written to the same @vrowser/fs instance
 * used by DevEnvironment and the transform pipeline.
 */
export function updateFile(path: string, content: string): void {
  const dir = path.substring(0, path.lastIndexOf('/'))
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(path, content, { encoding: 'utf8' })
  debug?.('file updated:', path)
  debug?.('current virtual files:', vol.toTree())
}

function updateFiles(files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    updateFile(path, content)
  }
}

// NOTE(kazupon): rolldown load for testing
export async function bundle(files: Record<string, string>, input: string): Promise<[string, string]> {
  debug?.('bundling', input)

  // memfs.volume.reset()
  // memfs.volume.fromJSON(files)
  updateFiles(files)

  fs.mkdirSync('/node_modules', { recursive: true })
  debug?.('virtual files (@vrowser/rolldown memfs):', memfs.fs.readdirSync('/'))
  debug?.('virtual files (@vrowser/fs memfs):', fs.readdirSync('/'))

  const bundle = await rolldown({ input, cwd: '/' })
  const { output } = await bundle.generate({ format: 'esm' })

  return [output[0].code, output[0].fileName]
}

// === DevEnvironment ===
export type { DevEnvironmentContext } from './server/environment'
export { DevEnvironment }

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

// === RPC types ===
export type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'

// === Protocol message types & constants ===
export {
  V_SW_CONNECT_PORT,
  V_SW_CONNECT_PORT_ACK, V_WW_CONNECT_PORT,
  V_WW_CONNECT_PORT_ACK, V_WW_SETUP,
  V_WW_SETUP_ACK, V_WW_SW_CHANNEL_READY
} from '../shared/messages'
export type {
  ConnectServiceWorkerPortAckMessage, ConnectServiceWorkerPortMessage, ConnectWebWorkerPortAckMessage, ConnectWebWorkerPortMessage, SetupWorkerAckMessage, SetupWorkerMessage, WebWorkerServiceWorkerChannelReadyMessage
} from '../shared/messages'

