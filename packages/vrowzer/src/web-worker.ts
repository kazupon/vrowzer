/**
 * Web Worker entry point for vrowzer preview system.
 *
 * This file is NOT bundled by vrowzer's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowzer (which provides resolve.alias for node:* polyfills).
 *
 * @module web-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { initWebWorker } from './web-worker-core'

// oxlint-disable-next-line typescript/no-floating-promises -- ignore for web worker timing
initWebWorker()
