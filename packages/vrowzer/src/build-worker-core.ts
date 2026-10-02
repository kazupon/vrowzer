/**
 * Build Worker core for vrowzer (SPIKE #36).
 *
 * Builds a snapshot of the project files with Vite's build pipeline. The runtime creates one
 * build Worker per instance on the first `build()`, and keeps it until `dispose()`.
 *
 * @module build-worker-core
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope

export const V_BW_READY = 'V_BW_READY'
export const V_BW_BUILD = 'V_BW_BUILD'
export const V_BW_RESULT = 'V_BW_RESULT'

type UserConfigLike = Record<string, unknown> & { plugins?: unknown[] }

/**
 * @param createConfig - Creates the Worker config for each build, so that each build gets new
 * plugin instances (SPIKE #36, decision 5 R3). Omitted when the host has no Worker config.
 */
export function initBuildWorker(createConfig?: () => UserConfigLike | Promise<UserConfigLike>) {
  const startedAt = performance.now()
  // Load the builder (rolldown WASM) after registering the listener
  const builderPromise = import('@vrowzer/vite-dev-server/builder')

  self.addEventListener('message', event => {
    const data = event.data as {
      type?: string
      id?: number
      files?: Record<string, string | ArrayBuffer>
      options?: Record<string, unknown>
    }
    if (data?.type !== V_BW_BUILD) {
      return
    }
    void (async () => {
      try {
        const builder = await builderPromise
        const userConfig = createConfig ? await createConfig() : {}
        const options = data.options ?? {}
        const inlineConfig = {
          ...userConfig,
          ...options,
          plugins: [...(userConfig.plugins ?? [])],
          define: {
            ...(userConfig.define as Record<string, unknown> | undefined),
            ...(options.define as Record<string, unknown> | undefined)
          },
          build: {
            ...(userConfig.build as Record<string, unknown> | undefined),
            ...(options.build as Record<string, unknown> | undefined)
          }
        }
        const result = await builder.buildProject(data.files ?? {}, inlineConfig as never)
        const transfer = Object.values(result.files).filter(
          (value): value is ArrayBuffer => value instanceof ArrayBuffer
        )
        self.postMessage({ type: V_BW_RESULT, id: data.id, ok: true, result }, transfer)
      } catch (error) {
        const e = error as {
          message?: string
          stack?: string
          plugin?: string
          id?: string
          code?: string
          loc?: unknown
          frame?: string
          errors?: unknown[]
        }
        self.postMessage({
          type: V_BW_RESULT,
          id: data.id,
          ok: false,
          error: {
            message: String(e?.message ?? error),
            stack: e?.stack,
            plugin: e?.plugin,
            id: e?.id,
            code: e?.code,
            loc: e?.loc,
            frame: e?.frame,
            errors: Array.isArray(e?.errors)
              ? e.errors.map(item => String((item as { message?: string })?.message ?? item))
              : undefined
          }
        })
      }
    })()
  })

  void builderPromise.then(
    () => {
      self.postMessage({ type: V_BW_READY, readyIn: performance.now() - startedAt })
    },
    error => {
      self.postMessage({ type: V_BW_READY, error: String(error?.stack ?? error) })
    }
  )
}
