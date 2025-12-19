import { EventEmitter } from 'node:events'
import path from 'pathe'
import colors from 'picocolors'
import { isExplicitImportRequired } from './plugins/importAnalysis.ts'
import { withTrailingSlash, wrapId } from './shared/utils.ts'
import { createDebugger } from './utils.ts'

import type {
  CustomPayload,
  EnvironmentModuleNode,
  HotChannel,
  HotChannelClient,
  HotPayload,
  NormalizedHotChannel,
  NormalizedHotChannelClient,
  Update
} from 'vite'
import type { DevEnvironment } from './environment.ts'
import type { InvokeMethods, InvokeResponseData, InvokeSendData } from './shared/invokeMethods.ts'

// ---

const debugHmr: ((...args: any[]) => any) | undefined = createDebugger('vite:hmr')

interface PropagationBoundary {
  boundary: EnvironmentModuleNode & { type: 'js' | 'css' }
  acceptedVia: EnvironmentModuleNode
  isWithinCircularImport: boolean
}

export function getShortName(file: string, root: string): string {
  return file.startsWith(withTrailingSlash(root)) ? path.posix.relative(root, file) : file
}

export const normalizeHotChannel = (
  channel: HotChannel,
  enableHmr: boolean,
  normalizeClient = true
): NormalizedHotChannel => {
  const normalizedListenerMap = new WeakMap<
    (data: any, client: NormalizedHotChannelClient) => void | Promise<void>,
    (data: any, client: HotChannelClient) => void | Promise<void>
  >()
  const normalizedClients = new WeakMap<HotChannelClient, NormalizedHotChannelClient>()

  let invokeHandlers: InvokeMethods | undefined
  let listenerForInvokeHandler:
    | ((data: InvokeSendData, client: HotChannelClient) => void)
    | undefined
  const handleInvoke = async <T extends keyof InvokeMethods>(payload: HotPayload) => {
    if (!invokeHandlers) {
      return {
        error: {
          name: 'TransportError',
          message: 'invokeHandlers is not set',
          stack: new Error().stack
        }
      }
    }

    const data: InvokeSendData<T> = (payload as CustomPayload).data
    const { name, data: args } = data
    try {
      const invokeHandler = invokeHandlers[name]
      // @ts-expect-error `invokeHandler` is `InvokeMethods[T]`, so passing the args is fine
      const result = await invokeHandler(...args)
      return { result }
    } catch (error) {
      return {
        error: {
          // @ts-expect-error -- FIXME(kazupon): types
          name: error.name,
          // @ts-expect-error -- FIXME(kazupon): types
          message: error.message,
          // @ts-expect-error -- FIXME(kazupon): types
          stack: error.stack,
          // @ts-expect-error -- FIXME(kazupon): types
          ...error // preserve enumerable properties such as RollupError.loc, frame, plugin
        }
      }
    }
  }

  return {
    ...channel,
    on: (event: string, fn: (data: any, client: NormalizedHotChannelClient) => void) => {
      if (event === 'connection' || !normalizeClient) {
        channel.on?.(event, fn as () => void)
        return
      }

      const listenerWithNormalizedClient = (data: any, client: HotChannelClient) => {
        if (!normalizedClients.has(client)) {
          normalizedClients.set(client, {
            send: (...args) => {
              let payload: HotPayload
              if (typeof args[0] === 'string') {
                payload = {
                  type: 'custom',
                  event: args[0],
                  data: args[1]
                }
              } else {
                payload = args[0]
              }
              client.send(payload)
            }
          })
        }
        fn(data, normalizedClients.get(client)!)
      }
      normalizedListenerMap.set(fn, listenerWithNormalizedClient)

      channel.on?.(event, listenerWithNormalizedClient)
    },
    off: (event: string, fn: () => void) => {
      if (event === 'connection' || !normalizeClient) {
        channel.off?.(event, fn as () => void)
        return
      }

      const normalizedListener = normalizedListenerMap.get(fn)
      if (normalizedListener) {
        channel.off?.(event, normalizedListener)
      }
    },
    // @ts-expect-error -- FIXME(kazupon): internal types
    setInvokeHandler(_invokeHandlers: InvokeMethods | undefined): void {
      invokeHandlers = _invokeHandlers
      if (!_invokeHandlers) {
        if (listenerForInvokeHandler) {
          channel.off?.('vite:invoke', listenerForInvokeHandler)
        }
        return
      }

      listenerForInvokeHandler = async (payload, client) => {
        const responseInvoke = payload.id.replace('send', 'response') as
          | 'response'
          | `response:${string}`
        client.send({
          type: 'custom',
          event: 'vite:invoke',
          data: {
            name: payload.name,
            id: responseInvoke,
            data: await handleInvoke({
              type: 'custom',
              event: 'vite:invoke',
              data: payload
            })
          } satisfies InvokeResponseData
        })
      }
      channel.on?.('vite:invoke', listenerForInvokeHandler)
    },
    handleInvoke,
    send: (...args: any[]) => {
      let payload: HotPayload
      if (typeof args[0] === 'string') {
        payload = {
          type: 'custom',
          event: args[0],
          data: args[1]
        }
      } else {
        payload = args[0]
      }

      if (
        enableHmr ||
        payload.type === 'connected' ||
        payload.type === 'ping' ||
        payload.type === 'custom' ||
        payload.type === 'error'
      ) {
        channel.send?.(payload)
      }
    },
    listen() {
      return channel.listen?.()
    },
    close() {
      return channel.close?.()
    }
  }
}

// ---

type HasDeadEnd = string | boolean

export function updateModules(
  environment: DevEnvironment,
  file: string,
  modules: EnvironmentModuleNode[],
  timestamp: number,
  firstInvalidatedBy?: string
): void {
  const { hot } = environment
  const updates: Update[] = []
  const invalidatedModules = new Set<EnvironmentModuleNode>()
  const traversedModules = new Set<EnvironmentModuleNode>()
  // Modules could be empty if a root module is invalidated via import.meta.hot.invalidate()
  let needFullReload: HasDeadEnd = modules.length === 0

  for (const mod of modules) {
    const boundaries: PropagationBoundary[] = []
    const hasDeadEnd = propagateUpdate(mod, traversedModules, boundaries)

    environment.moduleGraph.invalidateModule(
      // @ts-expect-error -- FIXME(kazupon): types
      mod,
      invalidatedModules,
      timestamp,
      true
    )

    if (needFullReload) {
      continue
    }

    if (hasDeadEnd) {
      needFullReload = hasDeadEnd
      continue
    }

    // If import.meta.hot.invalidate was called already on that module for the same update,
    // it means any importer of that module can't hot update. We should fallback to full reload.
    if (
      firstInvalidatedBy &&
      boundaries.some(({ acceptedVia }) => normalizeHmrUrl(acceptedVia.url) === firstInvalidatedBy)
    ) {
      needFullReload = 'circular import invalidate'
      continue
    }

    updates.push(
      ...boundaries.map(({ boundary, acceptedVia, isWithinCircularImport }) => ({
        type: `${boundary.type}-update` as const,
        timestamp,
        path: normalizeHmrUrl(boundary.url),
        acceptedPath: normalizeHmrUrl(acceptedVia.url),
        explicitImportRequired:
          boundary.type === 'js' ? isExplicitImportRequired(acceptedVia.url) : false,
        isWithinCircularImport,
        firstInvalidatedBy
      }))
    )
  }

  // html file cannot be hot updated because it may be used as the template for a top-level request response.
  const isClientHtmlChange =
    file.endsWith('.html') &&
    environment.name === 'client' &&
    // if the html file is imported as a module, we assume that this file is
    // not used as the template for top-level request response
    // (i.e. not used by the middleware).
    modules.every(mod => mod.type !== 'js')

  if (needFullReload || isClientHtmlChange) {
    const reason = typeof needFullReload === 'string' ? colors.dim(` (${needFullReload})`) : ''
    environment.logger.info(colors.green(`page reload `) + colors.dim(file) + reason, {
      clear: !firstInvalidatedBy,
      timestamp: true
    })
    hot.send({
      type: 'full-reload',
      triggeredBy: path.resolve(environment.config.root, file),
      path:
        !isClientHtmlChange || environment.config.server.middlewareMode || updates.length > 0 // if there's an update, other URLs may be affected
          ? '*'
          : '/' + file
    })
    return
  }

  if (updates.length === 0) {
    debugHmr?.(colors.yellow(`no update happened `) + colors.dim(file))
    return
  }

  environment.logger.info(
    colors.green(`hmr update `) + colors.dim([...new Set(updates.map(u => u.path))].join(', ')),
    { clear: !firstInvalidatedBy, timestamp: true }
  )
  hot.send({
    type: 'update',
    updates
  })
}

function areAllImportsAccepted(importedBindings: Set<string>, acceptedExports: Set<string>) {
  for (const binding of importedBindings) {
    if (!acceptedExports.has(binding)) {
      return false
    }
  }
  return true
}

function propagateUpdate(
  node: EnvironmentModuleNode,
  traversedModules: Set<EnvironmentModuleNode>,
  boundaries: PropagationBoundary[],
  currentChain: EnvironmentModuleNode[] = [node]
): HasDeadEnd {
  if (traversedModules.has(node)) {
    return false
  }
  traversedModules.add(node)

  // #7561
  // if the imports of `node` have not been analyzed, then `node` has not
  // been loaded in the browser and we should stop propagation.
  if (node.id && node.isSelfAccepting === undefined) {
    debugHmr?.(`[propagate update] stop propagation because not analyzed: ${colors.dim(node.id)}`)
    return false
  }

  if (node.isSelfAccepting) {
    // isSelfAccepting is only true for js and css
    const boundary = node as EnvironmentModuleNode & { type: 'js' | 'css' }
    boundaries.push({
      boundary,
      acceptedVia: boundary,
      isWithinCircularImport: isNodeWithinCircularImports(node, currentChain)
    })
    return false
  }

  // A partially accepted module with no importers is considered self accepting,
  // because the deal is "there are parts of myself I can't self accept if they
  // are used outside of me".
  // Also, the imported module (this one) must be updated before the importers,
  // so that they do get the fresh imported module when/if they are reloaded.
  if (node.acceptedHmrExports) {
    // acceptedHmrExports is only true for js and css
    const boundary = node as EnvironmentModuleNode & { type: 'js' | 'css' }
    boundaries.push({
      boundary,
      acceptedVia: boundary,
      isWithinCircularImport: isNodeWithinCircularImports(node, currentChain)
    })
  } else {
    if (!node.importers.size) {
      return true
    }
  }

  for (const importer of node.importers) {
    const subChain = currentChain.concat(importer)

    if (importer.acceptedHmrDeps.has(node)) {
      // acceptedHmrDeps has value only for js and css
      const boundary = importer as EnvironmentModuleNode & {
        type: 'js' | 'css'
      }
      boundaries.push({
        boundary,
        acceptedVia: node,
        isWithinCircularImport: isNodeWithinCircularImports(importer, subChain)
      })
      continue
    }

    if (node.id && node.acceptedHmrExports && importer.importedBindings) {
      const importedBindingsFromNode = importer.importedBindings.get(node.id)
      if (
        importedBindingsFromNode &&
        areAllImportsAccepted(importedBindingsFromNode, node.acceptedHmrExports)
      ) {
        continue
      }
    }

    if (
      !currentChain.includes(importer) &&
      propagateUpdate(importer, traversedModules, boundaries, subChain)
    ) {
      return true
    }
  }
  return false
}

/**
 * Check importers recursively if it's an import loop. An accepted module within
 * an import loop cannot recover its execution order and should be reloaded.
 *
 * @param node The node that accepts HMR and is a boundary
 * @param nodeChain The chain of nodes/imports that lead to the node.
 *   (The last node in the chain imports the `node` parameter)
 * @param currentChain The current chain tracked from the `node` parameter
 * @param traversedModules The set of modules that have traversed
 */
function isNodeWithinCircularImports(
  node: EnvironmentModuleNode,
  nodeChain: EnvironmentModuleNode[],
  currentChain: EnvironmentModuleNode[] = [node],
  traversedModules = new Set<EnvironmentModuleNode>()
): boolean {
  // To help visualize how each parameter works, imagine this import graph:
  //
  // A -> B -> C -> ACCEPTED -> D -> E -> NODE
  //      ^--------------------------|
  //
  // ACCEPTED: the node that accepts HMR. the `node` parameter.
  // NODE    : the initial node that triggered this HMR.
  //
  // This function will return true in the above graph, which:
  // `node`         : ACCEPTED
  // `nodeChain`    : [NODE, E, D, ACCEPTED]
  // `currentChain` : [ACCEPTED, C, B]
  //
  // It works by checking if any `node` importers are within `nodeChain`, which
  // means there's an import loop with a HMR-accepted module in it.

  if (traversedModules.has(node)) {
    return false
  }
  traversedModules.add(node)

  for (const importer of node.importers) {
    // Node may import itself which is safe
    if (importer === node) continue

    // Check circular imports
    const importerIndex = nodeChain.indexOf(importer)
    if (importerIndex > -1) {
      // Log extra debug information so users can fix and remove the circular imports
      if (debugHmr) {
        // Following explanation above:
        // `importer`                    : E
        // `currentChain` reversed       : [B, C, ACCEPTED]
        // `nodeChain` sliced & reversed : [D, E]
        // Combined                      : [E, B, C, ACCEPTED, D, E]
        const importChain = [
          importer,
          ...[...currentChain].reverse(),
          ...nodeChain.slice(importerIndex, -1).reverse()
        ]
        debugHmr(
          colors.yellow(`circular imports detected: `) +
            importChain.map(m => colors.dim(m.url)).join(' -> ')
        )
      }
      return true
    }

    // Continue recursively
    if (!currentChain.includes(importer)) {
      const result = isNodeWithinCircularImports(
        importer,
        nodeChain,
        currentChain.concat(importer),
        traversedModules
      )
      if (result) return result
    }
  }
  return false
}

// ---

function normalizeHmrUrl(url: string): string {
  if (url[0] !== '.' && url[0] !== '/') {
    url = wrapId(url)
  }
  return url
}

// ---

type ServerHotChannelApi = {
  innerEmitter: EventEmitter
  outsideEmitter: EventEmitter
}

type ServerHotChannel = HotChannel<ServerHotChannelApi>
type NormalizedServerHotChannel = NormalizedHotChannel<ServerHotChannelApi>

export function createServerHotChannel(): ServerHotChannel {
  const innerEmitter = new EventEmitter()
  const outsideEmitter = new EventEmitter()

  return {
    send(payload: HotPayload) {
      outsideEmitter.emit('send', payload)
    },
    off(event, listener: () => void) {
      innerEmitter.off(event, listener)
    },
    on: ((event: string, listener: () => unknown) => {
      innerEmitter.on(event, listener)
    }) as ServerHotChannel['on'],
    close() {
      innerEmitter.removeAllListeners()
      outsideEmitter.removeAllListeners()
    },
    listen() {
      innerEmitter.emit('connection')
    },
    api: {
      innerEmitter,
      outsideEmitter
    }
  }
}
