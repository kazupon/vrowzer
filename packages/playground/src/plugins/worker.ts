import type { Plugin, ResolvedConfig } from 'vite'

// ---

export function webWorkerPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:worker'
    // ---
  }
}

function isSameContent(a: string | Uint8Array, b: string | Uint8Array) {
  if (typeof a === 'string') {
    if (typeof b === 'string') {
      return a === b
    }
    return Buffer.from(a).equals(b)
  }
  return Buffer.from(b).equals(a)
}
