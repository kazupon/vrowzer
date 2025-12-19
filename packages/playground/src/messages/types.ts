export interface ConnectMessage {
  type: 'connect'
  port: MessagePort
}

export interface BundleMessage {
  type: 'bundle'
  entry: string
  files: Record<string, string>
}

export interface DisconnectMessage {
  type: 'disconnect'
}

export type WorkerMessage = ConnectMessage | BundleMessage | DisconnectMessage

// Response types to Main
export interface ReadyResponse {
  type: 'ready'
}

export interface BundleErrorResponse {
  type: 'bundle-error'
  message: string
}

export type WorkerResponse = ReadyResponse | BundleErrorResponse

// Eval message to iframe (via MessagePort)
export interface EvalMessage {
  type: 'eval'
  code: string
  path: string
}
