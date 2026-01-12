import type { SvcWorkerController, SvcWorkerControllerState } from '../src/controller.ts'

declare global {
  interface Window {
    dynamicImport?: <T = unknown>(url: string) => Promise<T>
    testState: {
      controller: SvcWorkerController | null
      states: SvcWorkerControllerState[]
      events: { type: string; data?: unknown }[]
    }
  }
}

export {}
