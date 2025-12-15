import type { Plugin, ResolvedConfig } from 'vite'

/**
 * Convert `new URL('./foo.png', import.meta.url)` to its resolved built URL
 *
 * Supports template string with dynamic segments:
 * ```
 * new URL(`./dir/${name}.png`, import.meta.url)
 * // transformed to
 * import.meta.glob('./dir/**.png', { eager: true, import: 'default' })[`./dir/${name}.png`]
 * ```
 */
export function assetImportMetaUrlPlugin(config: ResolvedConfig): Plugin {
  // ---

  return {
    name: 'vite:asset-import-meta-url'

    // ---
  }
}
