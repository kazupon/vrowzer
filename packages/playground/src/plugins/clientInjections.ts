import type { Plugin, ResolvedConfig } from 'vite'

/**
 * some values used by the client needs to be dynamically injected by the server
 * @server-only
 */
export function clientInjectionsPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:client-inject'

    // ---
  }
}
