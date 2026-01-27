// TODO: fill in later ...
// import { safeMessagePort } from '@kazupon/jts-utils/message/port'

import type { HotPayload } from '#types/hmrPayload'
import { safeMessagePort } from '@kazupon/jts-utils/message'

import type {
  InvokeMethods
} from './invokeMethods'

export type ModuleRunnerTransportHandlers = {
  onMessage: (data: HotPayload) => void
  onDisconnection: () => void
}

/**
 * "send and connect" or "invoke" must be implemented
 */
export interface ModuleRunnerTransport {
  connect?(handlers: ModuleRunnerTransportHandlers): Promise<void> | void
  disconnect?(): Promise<void> | void
  send?(data: HotPayload): Promise<void> | void
  invoke?(data: HotPayload): Promise<{ result: any } | { error: any }>
  timeout?: number
}

type InvokeableModuleRunnerTransport = Omit<ModuleRunnerTransport, 'invoke'> & {
  invoke<T extends keyof InvokeMethods>(
    name: T,
    data: Parameters<InvokeMethods[T]>,
  ): Promise<ReturnType<Awaited<InvokeMethods[T]>>>
}

function reviveInvokeError(e: any) {
  const error = new Error(e.message || 'Unknown invoke error')
  Object.assign(error, e, {
    // pass the whole error instead of just the stacktrace
    // so that it gets formatted nicely with console.log
    runnerError: new Error('RunnerError'),
  })
  return error
}

// TODO: fill in later ...

export interface NormalizedModuleRunnerTransport {
  connect?(onMessage?: (data: HotPayload) => void): Promise<void> | void
  disconnect?(): Promise<void> | void
  send(data: HotPayload): Promise<void>
  invoke<T extends keyof InvokeMethods>(
    name: T,
    data: Parameters<InvokeMethods[T]>,
  ): Promise<ReturnType<Awaited<InvokeMethods[T]>>>
}

export const normalizeModuleRunnerTransport = (
  transport: ModuleRunnerTransport,
): NormalizedModuleRunnerTransport => {
  // TODO: implement later ...

  return {} as NormalizedModuleRunnerTransport
}

// MessageChannel connection events
const MC_INIT_EVENT = 'vite:mc:init'
// Vite-compatible events (same as vite:ws:connect/disconnect)
const WS_CONNECT_EVENT = 'vite:ws:connect'
const WS_DISCONNECT_EVENT = 'vite:ws:disconnect'

export const createMessageChannelModuleRunnerTransport = (
  postMessage: Window['postMessage'],
  options: {
    pingInterval?: number
    timeout?: number
    targetOrigin?: string
  } = {}
): Required<
  Pick<ModuleRunnerTransport, 'connect' | 'disconnect' | 'send'>
> => {
  const pingInterval = options.pingInterval ?? 30000
  const targetOrigin = options.targetOrigin ?? '*'
  const timeout = options.timeout ?? 10000

  let sourcePort: ReturnType<typeof safeMessagePort> | undefined
  let pingIntervalId: ReturnType<typeof setInterval> | undefined

  return {
    async connect({ onMessage, onDisconnection }) {
      // Create `MessageChannel`
      const channel = new MessageChannel()
      sourcePort = safeMessagePort(channel.port1)

      // Transfer `port2` to host via `postMessage`
      postMessage(
        { type: MC_INIT_EVENT },
        targetOrigin,
        [channel.port2]
      )

      // Wait for connection confirmation (`vite:mc:init` echo from remote)
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('MessageChannel connection timeout'))
        }, timeout)

        sourcePort!.once('message', (event: MessageEvent) => {
          if (event.data?.type === MC_INIT_EVENT) {
            clearTimeout(timeoutId)
            resolve()
          }
        })
      })

      // Set up message listener
      sourcePort.on('message', (event: MessageEvent) => {
        const data = event.data as HotPayload
        if (data?.type === 'custom' && data?.event === WS_DISCONNECT_EVENT) {
          onMessage({
            type: 'custom',
            event: WS_DISCONNECT_EVENT,
            data: { port: sourcePort }
          })
          onDisconnection()
          return
        }
        onMessage(data)
      })

      // Emit connection event (Vite-compatible)
      onMessage({
        type: 'custom',
        event: WS_CONNECT_EVENT,
        data: { port: sourcePort }
      })

      // Set up ping interval for keep-alive (optional)
      if (pingInterval > 0) {
        pingIntervalId = setInterval(() => {
          sourcePort?.postMessage({ type: 'ping' })
        }, pingInterval)
      }
    },

    disconnect() {
      if (pingIntervalId) {
        clearInterval(pingIntervalId)
        pingIntervalId = undefined
      }
      sourcePort?.close()
      sourcePort = undefined
    },

    send(data) {
      sourcePort?.postMessage(data)
    }
  }
}

//
// NOTE(kazupon):
// Disable orignal WebSocket server implementation,
// because commented out codes as a context hint for sync with the original code from the forked source using the AI agent.
//
// export const createWebSocketModuleRunnerTransport = (options: {
//   // eslint-disable-next-line n/no-unsupported-features/node-builtins
//   createConnection: () => WebSocket
//   pingInterval?: number
// }): Required<
//   Pick<ModuleRunnerTransport, 'connect' | 'disconnect' | 'send'>
// > => {
//   const pingInterval = options.pingInterval ?? 30000
//
//   // eslint-disable-next-line n/no-unsupported-features/node-builtins
//   let ws: WebSocket | undefined
//   let pingIntervalId: ReturnType<typeof setInterval> | undefined
//   return {
//     async connect({ onMessage, onDisconnection }) {
//       const socket = options.createConnection()
//       socket.addEventListener('message', async ({ data }) => {
//         onMessage(JSON.parse(data))
//       })
//
//       let isOpened = socket.readyState === socket.OPEN
//       if (!isOpened) {
//         await new Promise<void>((resolve, reject) => {
//           socket.addEventListener(
//             'open',
//             () => {
//               isOpened = true
//               resolve()
//             },
//             { once: true },
//           )
//           socket.addEventListener('close', async () => {
//             if (!isOpened) {
//               reject(new Error('WebSocket closed without opened.'))
//               return
//             }
//
//             onMessage({
//               type: 'custom',
//               event: 'vite:ws:disconnect',
//               data: { webSocket: socket },
//             })
//             onDisconnection()
//           })
//         })
//       }
//
//       onMessage({
//         type: 'custom',
//         event: 'vite:ws:connect',
//         data: { webSocket: socket },
//       })
//       ws = socket
//
//       // proxy(nginx, docker) hmr ws maybe caused timeout,
//       // so send ping package let ws keep alive.
//       pingIntervalId = setInterval(() => {
//         if (socket.readyState === socket.OPEN) {
//           socket.send(JSON.stringify({ type: 'ping' }))
//         }
//       }, pingInterval)
//     },
//     disconnect() {
//       clearInterval(pingIntervalId)
//       ws?.close()
//     },
//     send(data) {
//       ws!.send(JSON.stringify(data))
//     },
//   }
// }

