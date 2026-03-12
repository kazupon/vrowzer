/**
 * Node.js builtin → browser polyfill alias mappings.
 *
 * Shared between env.ts (host Vite config) and prebundle.ts (Worker config bundling).
 *
 * @module alias
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

/**
 * Node.js builtin module → browser polyfill mapping.
 * Each entry maps both `node:xxx` and bare `xxx` specifiers.
 */
const NODE_POLYFILL_MAP: Record<string, string> = {
  events: '@vrowser/node-polyfill/events',
  path: 'pathe',
  stream: 'readable-stream/lib/stream',
  buffer: 'buffer',
  dns: '@vrowser/node-polyfill/dns',
  fs: '@vrowser/fs',
  'fs/promises': '@vrowser/fs/promises',
  url: '@vrowser/node-polyfill/url',
  readline: '@vrowser/node-polyfill/readline',
  util: '@vrowser/node-polyfill/util',
  perf_hooks: '@vrowser/node-polyfill/perf_hooks',
  crypto: '@vrowser/node-polyfill/crypto',
  tty: '@vrowser/node-polyfill/tty',
  module: '@vrowser/node-polyfill/module',
  os: '@vrowser/node-polyfill/os',
  net: '@vrowser/node-polyfill/net'
}

/**
 * Build a flat alias record from NODE_POLYFILL_MAP + additional aliases.
 * Generates both `node:xxx` and bare `xxx` entries for each builtin.
 *
 * @param extra - Additional alias entries to merge (e.g. `{ process: '...', 'process/': '...' }`)
 */
export function resolveAliases(extra?: Record<string, string>): Record<string, string> {
  const aliases: Record<string, string> = {}
  for (const [mod, polyfill] of Object.entries(NODE_POLYFILL_MAP)) {
    aliases[`node:${mod}`] = polyfill
    aliases[mod] = polyfill
  }
  if (extra) {
    Object.assign(aliases, extra)
  }
  return aliases
}
