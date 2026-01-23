interface ServerState {
  version: string
  listening: boolean
  closed: boolean
  errors: string[]
}

interface ControllerChange {
  time: number
  controller: string | null
}

interface TestEvent {
  type: string
  data?: unknown
}

declare global {
  interface Window {
    testState: {
      registration: ServiceWorkerRegistration | null
      serviceWorker: ServiceWorker | null
      serverState: ServerState | null
      events: TestEvent[]
      errors: string[]
      controllerChanges: ControllerChange[]
    }
    sendMessageToSW: <T = unknown>(type: string, data?: Record<string, unknown>) => Promise<T>
  }
}

export {}
