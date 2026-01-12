import type { SvcWorkerController, SvcWorkerControllerState } from '../src/controller.ts'

declare global {
  interface Window {
    dynamicImport?: <T = unknown>(url: string) => Promise<T>
    testState: {
      controller: SvcWorkerController | null
      states: Array<SvcWorkerControllerState>
      events: Array<{ type: string; data?: unknown }>
      controllerChanges: Array<{ time: number; controller: string | null }>
    }
  }
}

export {}
