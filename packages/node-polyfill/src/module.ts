/**
 * `node:module` compatible entry point
 *
 * Browser/Worker environments cannot use `require()`.
 * `createRequire()` returns a stub that throws on invocation.
 *
 * @module module
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

interface RequireFunction {
  (id: string): never
  resolve: (id: string) => string
  cache: Record<string, unknown>
}

/**
 * Create a require function bound to the given URL.
 * In browser/Worker environments, the returned `require()` throws on invocation
 * since CommonJS modules cannot be loaded.
 */
export function createRequire(_url: string | URL): RequireFunction {
  function require(_id: string): never {
    throw new Error(`[vrowzer] require() is not supported in browser/Worker environment`)
  }
  require.resolve = (id: string): string => id
  require.cache = {} as Record<string, unknown>
  return require
}

/**
 * List of Node.js builtin module names (without `node:` prefix).
 */
export const builtinModules: string[] = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib'
]

const _builtinSet = new Set(builtinModules)

/**
 * Check if a module name is a Node.js builtin module.
 */
export function isBuiltin(moduleName: string): boolean {
  const name = moduleName.startsWith('node:') ? moduleName.slice(5) : moduleName
  return _builtinSet.has(name)
}

export default {
  createRequire,
  builtinModules,
  isBuiltin
}
