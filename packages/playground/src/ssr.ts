import type { SSROptions } from 'vite'

const _ssrConfigDefaults = Object.freeze({
  // noExternal
  // external
  target: 'node',
  optimizeDeps: {}
  // resolve
} satisfies SSROptions)
export const ssrConfigDefaults: Readonly<Partial<SSROptions>> = _ssrConfigDefaults
