import { viteJsonPlugin as nativeJsonPlugin } from '@vrowzer/rolldown/experimental'
// NOTE(kazupon): comment out, because we need to understand the previous implementation as background
// import { viteJsonPlugin as nativeJsonPlugin } from 'rolldown/experimental'
import type { Plugin } from '../plugin'

export interface JsonOptions {
  /**
   * Generate a named export for every property of the JSON object
   * @default true
   */
  namedExports?: boolean
  /**
   * Generate performant output as JSON.parse("stringified").
   *
   * When set to 'auto', the data will be stringified only if the data is bigger than 10kB.
   * @default 'auto'
   */
  stringify?: boolean | 'auto'
}

const jsonLangs = `\\.(?:json|json5)(?:$|\\?)`
const jsonLangRE = new RegExp(jsonLangs)
export const isJSONRequest = (request: string): boolean =>
  jsonLangRE.test(request)

// NOTE(kazupon): Vite registers `nativeJsonPlugin` directly in `plugins/index.ts`.
// Vrowzer keeps this wrapper, because `plugins/index.ts` loads plugins with `import('./json')`
// to keep plugin dependencies out of the scripts that do not need them.
export function jsonPlugin(
  options: Required<JsonOptions>,
  isBuild: boolean,
): Plugin {
  return nativeJsonPlugin({ ...options, minify: isBuild })
}
