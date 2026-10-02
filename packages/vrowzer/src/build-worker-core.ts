/**
 * Build Worker core for vrowzer.
 *
 * Builds a snapshot of the project files with Vite's build, in a Worker that the runtime creates
 * for each `build()` and terminates when the build ends.
 *
 * This file is NOT bundled by vrowzer's build. It is exported as TypeScript source and bundled by
 * the user's Vite + Vrowzer, like `web-worker-core.ts`.
 *
 * @module build-worker-core
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/// <reference lib="webworker" />

import { V_BW_BUILD, V_BW_READY, V_BW_RESULT } from './build-messages.ts'

import type { UserConfig } from '@vrowzer/vite-dev-server/vite'
import type {
  BuildWorkerBuildMessage,
  BuildWorkerLog,
  BuildWorkerReadyMessage,
  BuildWorkerResultMessage
} from './build-messages.ts'

declare const self: DedicatedWorkerGlobalScope

function isBuildMessage(data: unknown): data is BuildWorkerBuildMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === V_BW_BUILD &&
    typeof (data as { id?: unknown }).id === 'number'
  )
}

function toErrors(error: unknown): BuildWorkerLog[] {
  const errors = (error as { errors?: unknown } | null)?.errors
  if (Array.isArray(errors) && errors.length > 0) {
    return errors as BuildWorkerLog[]
  }
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error)
  return [{ message }]
}

/**
 * Starts the build Worker.
 *
 * @param config - The Worker config, bundled for builds. The options of each `build()` are merged
 * over it.
 */
export function initBuildWorker(config: UserConfig = {}): void {
  // Listen before loading the builder, which loads rolldown and its WebAssembly
  const builder = import('@vrowzer/vite-dev-server/builder')

  self.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data
    if (!isBuildMessage(data)) {
      return
    }
    void (async () => {
      try {
        const { buildProject, mergeConfig } = await builder
        const result = await buildProject(data.files, mergeConfig(config, data.options))
        const transfer = Object.values(result.files).filter(
          (content): content is ArrayBuffer => content instanceof ArrayBuffer
        )
        self.postMessage(
          {
            type: V_BW_RESULT,
            id: data.id,
            ok: true,
            files: result.files,
            warnings: result.warnings
          } satisfies BuildWorkerResultMessage,
          transfer
        )
      } catch (error) {
        self.postMessage({
          type: V_BW_RESULT,
          id: data.id,
          ok: false,
          errors: toErrors(error)
        } satisfies BuildWorkerResultMessage)
      }
    })()
  })

  builder.then(
    () => {
      self.postMessage({ type: V_BW_READY } satisfies BuildWorkerReadyMessage)
    },
    (error: unknown) => {
      self.postMessage({
        type: V_BW_READY,
        error: error instanceof Error ? error.message : String(error)
      } satisfies BuildWorkerReadyMessage)
    }
  )
}
