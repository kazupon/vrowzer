import type {
  HotPayload,
  InferCustomEventPayload,
  NormalizedHotChannel,
  NormalizedHotChannelClient,
  ResolvedConfig
} from 'vite'
import type { WindowMessageDevServer } from './messages/dev.ts'

export const HMR_HEADER = 'vite-hmr'

type WindowMessageCustomListener<T> = (data: T, client: WindowMessageHmrClient) => void

export const isWindowMessageHmrServer: unique symbol = Symbol('isWindowMessageHmrServer')

export interface WindowMessageHmrServer extends NormalizedHotChannel {
  /**
   * Handle custom event emitted by `import.meta.hot.send`
   */
  // on: WebSocketTypes.Server['on'] & {
  on: {
    <T extends string>(
      event: T,
      listener: WindowMessageCustomListener<InferCustomEventPayload<T>>
    ): void
  }
  /**
   * Unregister event listener.
   */
  // off: WebSocketTypes.Server['off'] & {
  off: {
    (event: string, listener: Function): void
  }
  handleInvoke(payload: HotPayload): Promise<
    | {
        result: any
      }
    | {
        error: any
      }
  >
  /**
   * Listen on port and host
   */
  listen(): void
  /**
   * Disconnect all clients and terminate the server.
   */
  close(): Promise<void>

  [isWindowMessageHmrServer]: true
  /**
   * Get all connected clients.
   */
  clients: Set<WindowMessageHmrClient>
}

export interface WindowMessageHmrClient extends NormalizedHotChannelClient {
  // TODO(kazupon): define proper type
  channel?: any
}

function noop() {
  // noop
}

export function createWindowMessageHmrServer(
  server: WindowMessageDevServer | null,
  hrmPort: MessagePort,
  config: ResolvedConfig
): WindowMessageHmrServer {
  if (config.server.ws === false) {
    return {
      [isWindowMessageHmrServer]: true,
      get clients() {
        return new Set<WindowMessageHmrClient>()
      },
      async close() {
        // noop
      },
      on: noop,
      off: noop,
      setInvokeHandler: noop,
      handleInvoke: async () => ({
        error: {
          name: 'TransportError',
          message: 'handleInvoke not implemented',
          stack: new Error().stack
        }
      }),
      listen: noop,
      send: noop
    } as WindowMessageHmrServer
  }

  return {} as WindowMessageHmrServer
}
