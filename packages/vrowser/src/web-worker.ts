/**
 * Web Worker entry point for vrowser preview system.
 *
 * This file is NOT bundled by vrowser's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowser (which provides resolve.alias for node:* polyfills).
 *
 * @module web-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { initWebWorker } from './web-worker-core'

// eslint-disable-next-line no-floating-promises -- ignore for web worker timing
initWebWorker()
