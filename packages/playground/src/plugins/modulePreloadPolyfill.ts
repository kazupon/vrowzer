import type { Plugin, ResolvedConfig } from 'vite'

export const modulePreloadPolyfillId = 'vite/modulepreload-polyfill'
const resolvedModulePreloadPolyfillId = '\0' + modulePreloadPolyfillId + '.js'

export function modulePreloadPolyfillPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:modulepreload-polyfill'
    // ---
  }
}
