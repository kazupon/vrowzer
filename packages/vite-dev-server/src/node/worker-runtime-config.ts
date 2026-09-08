/**
 * Keep the standard preview's Web Worker consistent with its Service Worker.
 * This module must stay independent of the config resolver and WASM imports.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { posix } from 'pathe'

const experimentalKeys = [
  'importGlobRestoreExtension',
  'hmrPartialAccept',
  'enableNativePlugin',
  'bundledDev',
] as const

/** @internal Snapshot of the settings supplied by the standard preview runtime. */
export interface WorkerRuntimeConfig {
  readonly root: unknown
  readonly base: unknown
  readonly publicDir: unknown
  readonly optimizeDeps: Readonly<{ disabled: unknown }>
  readonly experimental: Readonly<Record<string, unknown>>
}

function block(config: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = config[key]
  if (value === undefined) {
    return {}
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`[vrowzer] Worker config ${key} must be an object`)
  }
  return value as Record<string, unknown>
}

export function snapshotWorkerRuntimeConfig(config: Record<string, unknown>): WorkerRuntimeConfig {
  const experimental = block(config, 'experimental')
  return Object.freeze({
    root: config.root,
    base: config.base,
    publicDir: config.publicDir,
    optimizeDeps: Object.freeze({ disabled: block(config, 'optimizeDeps').disabled }),
    experimental: Object.freeze(
      Object.fromEntries(experimentalKeys.map(key => [key, experimental[key]])),
    ),
  })
}

export function assertWorkerRuntimeConfig(
  config: Record<string, unknown>,
  runtime: WorkerRuntimeConfig,
  resolved = false,
): void {
  const normalizeRoot = (value: unknown) =>
    typeof value === 'string' ? posix.resolve('/', value) : value
  const normalizeBase = (value: unknown) =>
    typeof value === 'string' && !value.endsWith('/') ? `${value}/` : value
  const normalizePublicDir = (value: unknown) =>
    typeof value === 'string' && value.length > 0
      ? posix.resolve(String(runtime.root), value)
      : value

  function check(key: string, value: unknown, expected: unknown, normalize = (value: unknown) => value) {
    if (!resolved && value === undefined) {
      return
    }
    if (normalize(value) !== normalize(expected)) {
      throw new Error(
        `[vrowzer] Worker config cannot change runtime-owned ${key}: expected ${String(expected)}, received ${String(value)}`,
      )
    }
  }

  check('root', config.root, runtime.root, normalizeRoot)
  check('base', config.base, runtime.base, normalizeBase)
  check('publicDir', config.publicDir, runtime.publicDir, normalizePublicDir)
  // Framework hooks may rewrite this deprecated flag. Environment creation
  // disables the optimizer independently of the resolved optimizeDeps settings.
  if (!resolved) {
    check(
      'optimizeDeps.disabled',
      block(config, 'optimizeDeps').disabled,
      runtime.optimizeDeps.disabled,
    )
  }
  const experimental = block(config, 'experimental')
  for (const key of experimentalKeys) {
    check(`experimental.${key}`, experimental[key], runtime.experimental[key])
  }
}

export function mergeWorkerRuntimeConfig(
  runtimeConfig: Record<string, unknown>,
  userConfig: Record<string, unknown>,
  runtime: WorkerRuntimeConfig,
): Record<string, unknown> {
  assertWorkerRuntimeConfig(userConfig, runtime)
  return {
    ...runtimeConfig,
    ...userConfig,
    root: runtime.root,
    base: runtime.base,
    publicDir: runtime.publicDir,
    optimizeDeps: {
      ...block(runtimeConfig, 'optimizeDeps'),
      ...block(userConfig, 'optimizeDeps'),
      ...runtime.optimizeDeps,
    },
    experimental: {
      ...block(runtimeConfig, 'experimental'),
      ...block(userConfig, 'experimental'),
      ...runtime.experimental,
    },
  }
}
