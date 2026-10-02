/**
 * Messages between the runtime and the build Worker.
 *
 * Like `build-worker-core.ts`, this file is exported as TypeScript source, so it must not import
 * the runtime.
 *
 * @module build-messages
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Sent by the build Worker once it has loaded the builder, or failed to.
 */
export const V_BW_READY = 'V_BW_READY'
/**
 * Sent by the runtime to request a build.
 */
export const V_BW_BUILD = 'V_BW_BUILD'
/**
 * Sent by the build Worker with the result of a build.
 */
export const V_BW_RESULT = 'V_BW_RESULT'

/**
 * A log of a build: an error or a warning.
 */
export interface BuildWorkerLog {
  message: string
  code?: string
  plugin?: string
  id?: string
  loc?: { line: number; column: number; file?: string }
  frame?: string
}

export interface BuildWorkerReadyMessage {
  type: typeof V_BW_READY
  /**
   * Why the builder could not be loaded
   */
  error?: string
}

export interface BuildWorkerBuildMessage {
  type: typeof V_BW_BUILD
  /**
   * Identifies the build, so that the runtime can ignore the results of other builds
   */
  id: number
  /**
   * The snapshot of the project files, keyed by absolute path
   */
  files: Record<string, string | ArrayBuffer>
  /**
   * The options of `build()`, without `signal`, merged over the Worker config
   */
  options: Record<string, unknown>
}

export type BuildWorkerResultMessage =
  | {
      type: typeof V_BW_RESULT
      id: number
      ok: true
      files: Record<string, string | ArrayBuffer>
      warnings: BuildWorkerLog[]
    }
  | {
      type: typeof V_BW_RESULT
      id: number
      ok: false
      errors: BuildWorkerLog[]
    }
