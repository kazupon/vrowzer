/**
 * Build Worker entry point for vrowzer.
 *
 * This file is NOT bundled by vrowzer's build. It is exported as TypeScript source and bundled by
 * the user's Vite + Vrowzer. `@vrowzer/vite-plugin` rewrites it to pass the Worker config, or to a
 * stub when `vrowzer.build()` is not enabled.
 *
 * @module build-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { initBuildWorker } from './build-worker-core'

initBuildWorker()
