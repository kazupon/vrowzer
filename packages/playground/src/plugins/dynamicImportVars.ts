import type { Plugin, ResolvedConfig } from 'vite'

export function dynamicImportVarsPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:dynamic-import-vars'

    // ---
  }
}
