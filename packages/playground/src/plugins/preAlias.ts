import type { Plugin, ResolvedConfig } from 'vite'

/**
 * A plugin to avoid an aliased AND optimized dep from being aliased in src
 */
export function preAliasPlugin(config: ResolvedConfig): Plugin {
  // ---
  return {
    name: 'vite:pre-alias'

    // ---
  }
}
