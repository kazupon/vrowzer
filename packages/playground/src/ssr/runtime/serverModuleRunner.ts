import { ModuleRunner, createNodeImportMeta } from 'vite/module-runner'

import type {
  HotChannelClient,
  HotPayload,
  NormalizedServerHotChannel,
  ServerModuleRunnerOptions
} from 'vite'
import type { ModuleRunnerTransport } from 'vite/module-runner'
import type { DevEnvironment } from '../../environment.ts'

// ---

function createHMROptions(environment: DevEnvironment, options: ServerModuleRunnerOptions) {
  if (environment.config.server.hmr === false || options.hmr === false) {
    return false
  }
  if (!('api' in environment.hot)) return false
  return {
    logger: options.hmr?.logger
  }
}

const prepareStackTrace = {
  retrieveFile(id: string) {
    // TODO(kazupon): use virtual FS
    // if (existsSync(id)) {
    //   return readFileSync(id, 'utf-8')
    // }
  }
}

function resolveSourceMapOptions(options: ServerModuleRunnerOptions) {
  if (options.sourcemapInterceptor != null) {
    if (options.sourcemapInterceptor === 'prepareStackTrace') {
      return prepareStackTrace
    }
    if (typeof options.sourcemapInterceptor === 'object') {
      return { ...prepareStackTrace, ...options.sourcemapInterceptor }
    }
    return options.sourcemapInterceptor
  }
  if (typeof process !== 'undefined' && 'setSourceMapsEnabled' in process) {
    return 'node'
  }
  return prepareStackTrace
}

const createServerModuleRunnerTransport = (options: {
  channel: NormalizedServerHotChannel
}): ModuleRunnerTransport => {
  const hmrClient: HotChannelClient = {
    send: (payload: HotPayload) => {
      if (payload.type !== 'custom') {
        throw new Error('Cannot send non-custom events from the client to the server.')
      }
      options.channel.send(payload)
    }
  }

  let handler: ((data: HotPayload) => void) | undefined

  return {
    connect({ onMessage }) {
      options.channel.api!.outsideEmitter.on('send', onMessage)
      options.channel.api!.innerEmitter.emit('vite:client:connect', undefined, hmrClient)
      onMessage({ type: 'connected' })
      handler = onMessage
    },
    disconnect() {
      if (handler) {
        options.channel.api!.outsideEmitter.off('send', handler)
      }
      options.channel.api!.innerEmitter.emit('vite:client:disconnect', undefined, hmrClient)
    },
    send(payload) {
      if (payload.type !== 'custom') {
        throw new Error('Cannot send non-custom events from the server to the client.')
      }
      options.channel.api!.innerEmitter.emit(payload.event, payload.data, hmrClient)
    }
  }
}

/**
 * Create an instance of the Vite SSR runtime that support HMR.
 * @experimental
 */
export function createServerModuleRunner(
  environment: DevEnvironment,
  options: ServerModuleRunnerOptions = {}
): ModuleRunner {
  const hmr = createHMROptions(environment, options)
  return new ModuleRunner(
    {
      ...options,
      transport: createServerModuleRunnerTransport({
        channel: environment.hot as NormalizedServerHotChannel
      }),
      hmr,
      createImportMeta: createNodeImportMeta,
      // @ts-expect-error -- FIXME(kazupon): types are not aligned
      sourcemapInterceptor: resolveSourceMapOptions(options)
    },
    options.evaluator
  )
}
