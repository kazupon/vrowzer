/**
 * Build Worker entry point for vrowzer (SPIKE #36).
 *
 * Like `web-worker.ts`, this file is exported as TypeScript source and bundled by the user's
 * Vite + Vrowzer. The Vite plugin rewrites it to pass the Worker config.
 *
 * @module build-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { initBuildWorker } from './build-worker-core'

initBuildWorker()
