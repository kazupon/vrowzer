import type {
  SvcWorkerController,
  SvcWorkerControllerState
} from '@vrowser/service-worker/controller'

declare global {
  interface Window {
    testState: {
      controller: SvcWorkerController | null
      states: Array<SvcWorkerControllerState>
      events: Array<{ type: string; data?: unknown }>
      controllerChanges: Array<{ time: number; controller: string | null }>
    }
  }
}

export {}
