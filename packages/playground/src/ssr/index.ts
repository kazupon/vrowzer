import { mergeWithDefaults } from '../utils.ts'

import type { ResolvedSSROptions, SSROptions } from 'vite'

const _ssrConfigDefaults = Object.freeze({
  // noExternal
  // external
  target: 'node',
  optimizeDeps: {}
  // resolve
} satisfies SSROptions)
export const ssrConfigDefaults: Readonly<Partial<SSROptions>> = _ssrConfigDefaults

export function resolveSSROptions(
  ssr: SSROptions | undefined,
  preserveSymlinks: boolean
): ResolvedSSROptions {
  const defaults = mergeWithDefaults(_ssrConfigDefaults, {
    optimizeDeps: { esbuildOptions: { preserveSymlinks } }
  } satisfies SSROptions)
  return mergeWithDefaults(defaults, ssr ?? {})
}
