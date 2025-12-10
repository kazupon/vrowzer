import type {
  InferCustomEventPayload,
  NormalizedHotChannel,
  NormalizedHotChannelClient,
  ResolvedConfig
} from 'vite'

export const isWindowMessageServer: unique symbol = Symbol('isWindowMessageServer')

interface WindowMessageClient extends NormalizedHotChannelClient {
  // TODO(kazupon): define proper type
  channel?: any
}

type WindowMessageCustomListener<T> = (data: T, client: WindowMessageClient) => void

export interface WindowMessageServer extends NormalizedHotChannel {
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
  /**
   * Listen on port and host
   */
  listen(): void
  /**
   * Disconnect all clients and terminate the server.
   */
  close(): Promise<void>

  [isWindowMessageServer]: true
  /**
   * Get all connected clients.
   */
  clients: Set<WindowMessageClient>
}

export function createWindowMessageServer(config: ResolvedConfig): WindowMessageServer {
  return {} as WindowMessageServer
}
