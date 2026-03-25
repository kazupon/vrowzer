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
  events: '@vrowzer/node-polyfill/events',
  path: 'pathe',
  stream: 'readable-stream/lib/stream',
  buffer: 'buffer',
  dns: '@vrowzer/node-polyfill/dns',
  fs: '@vrowzer/fs',
  'fs/promises': '@vrowzer/fs/promises',
  url: '@vrowzer/node-polyfill/url',
  readline: '@vrowzer/node-polyfill/readline',
  util: '@vrowzer/node-polyfill/util',
  perf_hooks: '@vrowzer/node-polyfill/perf_hooks',
  crypto: '@vrowzer/node-polyfill/crypto',
  tty: '@vrowzer/node-polyfill/tty',
  module: '@vrowzer/node-polyfill/module',
  os: '@vrowzer/node-polyfill/os',
  net: '@vrowzer/node-polyfill/net'
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
