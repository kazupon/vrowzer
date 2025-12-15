import type { Plugin, ResolvedConfig } from 'vite'

export function importGlobPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:import-glob'

    // ---
  }
}
