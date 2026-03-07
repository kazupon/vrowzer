/**
 * Vite-compatible API entry point for @vrowser/vite-dev-server.
 *
 * This module re-exports APIs that `@vitejs/plugin-vue` and other ecosystem plugins
 * import from `"vite"`. By aliasing `vite` → `@vrowser/vite-dev-server/vite`,
 * these plugins can run inside Worker environments without pulling in the full
 * Vite package (which includes native dependencies like lightningcss).
 *
 * IMPORTANT: This entry MUST NOT statically import modules that depend on
 * @vrowser/rolldown (WASM). When used as a "vite" alias in Web Workers,
 * static WASM imports would block module evaluation and prevent self.onmessage
 * from being registered in time (causing V_WW_SETUP messages to be lost).
 * Heavy modules (transformWithEsbuild → oxc.ts) are loaded lazily via dynamic import.
 *
 * @module node/vite
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

// --- Utilities (lightweight, no WASM dependency) ---
export { createFilter, normalizePath, isCSSRequest } from './utils'

// --- CSS (lightweight, no WASM dependency) ---
export { formatPostcssSourceMap } from './plugins/css'

// --- Transform ---
// Safe to statically re-export: esbuild.ts internally uses dynamic import
// for oxc.ts (which depends on @vrowser/rolldown WASM), so WASM is not
// loaded at module evaluation time.
export { transformWithEsbuild } from './plugins/esbuild'

// --- Plugin types ---
export type { Plugin } from './plugin'
