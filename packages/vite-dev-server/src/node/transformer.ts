/**
 * Web Worker entry point for @vrowzer/vite-dev-server
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

import { fs, vol } from '@vrowzer/fs'
import { rolldown } from '@vrowzer/rolldown'
import { memfs } from '@vrowzer/rolldown/experimental'
import { createBirpc } from 'birpc'
import { deserializeRpcMessage, serializeRpcMessage } from '../shared/rpc'
import { isResolvedConfig, resolveConfig } from './config'
import { reloadOnTsconfigChange } from './plugins/esbuild'
import { initPublicFiles } from './publicDir'
import { DevEnvironment } from './server/environment'
import { handleHMRUpdate } from './server/hmr'
import { ModuleGraph } from './server/mixedModuleGraph'
import { isServerAccessDeniedForTransform } from './server/transformAccess'
import { createMessageChannelServer } from './server/ws'
import {
  createDebugger, normalizePath
} from './utils'
import {
  createNoopWatcher,
  getResolvedOutDirs,
  resolveChokidarOptions,
  resolveEmptyOutDir
} from './watch'

import type { FSWatcher } from '#dep-types/chokidar'
import type { BirpcReturn } from 'birpc'
import type { WebWorkerHmrPortMessage, WebWorkerServiceWorkerChannelReadyMessage } from '../shared/messages'
import type { ServiceWorkerFunctions, WorkerFunctions } from '../shared/rpc'
import type { InlineConfig, ResolvedConfig } from './config'
import type { ViteDevServer } from './server/index'

const debug = createDebugger('vrowzer:transformer')

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
  | 'moduleGraph'
  | 'watcher'
  | 'ws'
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
  moduleGraph: ModuleGraph
  watcher: FSWatcher
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
  externalWatcher?: import('#dep-types/chokidar').FSWatcher,
): Promise<SetupWorkerResult> {
  // Inject client base fix plugin for HMR module re-imports
  if (!isResolvedConfig(inlineConfig)) {
    inlineConfig.plugins = [
      ...(inlineConfig.plugins as any[] ?? []),
      clientBasePlugin(),
    ]
  }

  const config = isResolvedConfig(inlineConfig)
    ? inlineConfig
    : await resolveConfig(inlineConfig, 'serve')
  debug?.('config:', config)

  setupVirtualFiles(files)

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

  // Use external watcher if provided (e.g. VirtualFSWatcher from subscriber),
  // otherwise fall back to NoopWatcher.
  const watcher = externalWatcher ?? createNoopWatcher(resolvedWatchOptions)

  // Create DevEnvironment for each configured environment
  const environments = {} as Record<'client' | 'ssr', DevEnvironment>
  await Promise.all(
    Object.entries(config.environments).map(
      async ([name, environmentOptions]) => {
        const environment = await environmentOptions.dev.createEnvironment(
          name,
          config,
          {
            ws,
            // Disable dep optimizer in Worker — the optimizer's bundle step
            // partially fails: shared chunks are generated but main entry files
            // (react.js, react_jsx-dev-runtime.js) are missing from /.vite/deps/.
            // Root cause investigation needed. See conversation notes.
            disableDepsOptimizer: true,
          },
        )
        environments[(name as 'client' | 'ssr')] = environment

        const previousInstance =
          options.previousEnvironments?.[environment.name]
        await environment.init({ watcher, previousInstance })
        // Start HMR channel listening (equivalent to environment.listen() but without ViteDevServer)
        environment.hot.listen()
      },
    ),
  )
  debug?.('Created environments:', environments)

  // Backward compatibility

  let moduleGraph = new ModuleGraph({
    client: () => environments.client.moduleGraph,
    ssr: () => environments.ssr.moduleGraph,
  })
  // const hostname = await resolveHostname(config.server.host)
  // const resolvedUrls = resolveServerUrls(
  //   httpServer,
  //   config.server,
  //   hostname,
  //   httpsOptions,
  //   config,
  // )
  return { config, environments, moduleGraph, watcher, ws }
}

/**
 * Vite plugin that fixes @vite/client's base path for HMR module re-imports.
 *
 * The pre-built client has `const base = "/"` hardcoded,
 * but HMR re-import URLs need the correct base (e.g. "/__preview__/").
 *
 * @internal
 */
function clientBasePlugin() {
  let resolvedBase = '/'

  return {
    name: 'vrowzer:client-base',
    configResolved(config: ResolvedConfig) {
      resolvedBase = config.base
    },
    transform(code: string, id: string) {
      if (id.includes('/dist/client/client.mjs') && resolvedBase !== '/') {
        return {
          // Replace only `const base = "/"` (not `base$1` etc. used by overlay)
          code: code.replace(
            /const base = "\/";/,
            `const base = ${JSON.stringify(resolvedBase)};`
          ),
          map: null,
        }
      }
    },
  }
}

/**
 * Connect watcher events to HMR pipeline.
 *
 * Simplified version of Vite's server/index.ts watcher setup.
 * Handles 'change', 'add', and 'unlink' events from the watcher
 * to trigger module graph invalidation and HMR updates.
 *
 * @see https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/index.ts
 */
export async function setupHMR(server: ViteDevServer): Promise<void> {
  const { watcher, environments, config } = server
  const { server: serverConfig } = config

  const initPublicFilesPromise = initPublicFiles(config)
  const publicFiles = await initPublicFilesPromise
  const { publicDir } = config
  debug?.('publicDir:', publicDir, 'publicFiles:', publicFiles)

  const onHMRUpdate = async (
    type: 'create' | 'delete' | 'update',
    file: string,
  ) => {
    if (serverConfig.hmr !== false) {
      await handleHMRUpdate(type, file, server)
    }
  }

  const onFileAddUnlink = async (file: string, isUnlink: boolean) => {
    file = normalizePath(file)
    reloadOnTsconfigChange(server, file)

    await Promise.all(
      Object.values(server.environments).map((environment) =>
        environment.pluginContainer.watchChange(file, {
          event: isUnlink ? 'delete' : 'create',
        }),
      ),
    )

    if (publicDir && publicFiles) {
      if (file.startsWith(publicDir)) {
        const path = file.slice(publicDir.length)
        publicFiles[isUnlink ? 'delete' : 'add'](path)
        if (!isUnlink) {
          const clientModuleGraph = server.environments.client.moduleGraph
          const moduleWithSamePath =
            await clientModuleGraph.getModuleByUrl(path)
          const etag = moduleWithSamePath?.transformResult?.etag
          if (etag) {
            // The public file should win on the next request over a module with the
            // same path. Prevent the transform etag fast path from serving the module
            clientModuleGraph.etagToModuleMap.delete(etag)
          }
        }
      }
    }
    if (isUnlink) {
      // invalidate module graph cache on file change
      for (const environment of Object.values(server.environments)) {
        environment.moduleGraph.onFileDelete(file)
      }
    }
    await onHMRUpdate(isUnlink ? 'delete' : 'create', file)
  }

  const onFileChange = async (file: string) => {
    debug?.('watcher change:', file)

    file = normalizePath(file)
    reloadOnTsconfigChange(server, file)

    await Promise.all(
      Object.values(environments).map(environment =>
        environment.pluginContainer.watchChange(file, { event: 'update' }),
      ),
    )

    for (const environment of Object.values(environments)) {
      environment.moduleGraph.onFileChange(file)
    }

    await onHMRUpdate('update', file)
  }

  watcher.on('change', (file) => {
    onFileChange(file).catch((e) => server.config.logger.error(e))
  })

  watcher.on('add', (file) => {
    onFileAddUnlink(file, false).catch((e) => server.config.logger.error(e))
  })

  watcher.on('unlink', (file) => {
    onFileAddUnlink(file, true).catch((e) => server.config.logger.error(e))
  })
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
            serialize: serializeRpcMessage,
            deserialize: deserializeRpcMessage,
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
 * Update a file in the virtual filesystem (@vrowzer/fs).
 *
 * This ensures the file is written to the same @vrowzer/fs instance
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
  debug?.('virtual files (@vrowzer/rolldown memfs):', memfs.fs.readdirSync('/'))
  debug?.('virtual files (@vrowzer/fs memfs):', fs.readdirSync('/'))

  const bundle = await rolldown({ input, cwd: '/' })
  const { output } = await bundle.generate({ format: 'esm' })

  return [output[0].code, output[0].fileName]
}

// === Virtual FS (shared instance for subscriber injection) ===
export { fs, vol }

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
export { isServerAccessDeniedForTransform }
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
  NormalizedHotChannelClient, NormalizedServerHotChannel, ServerHotChannel, ServerHotChannelApi,
  WsOptions
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
export type { HtmlAssetSource } from './assetSource'
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
