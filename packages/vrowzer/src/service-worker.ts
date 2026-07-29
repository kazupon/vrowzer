/**
 * Service Worker entry point for vrowzer preview system.
 *
 * This file is NOT bundled by vrowzer's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowzer (which provides resolve.alias for node:* polyfills).
 * The unplugin-service-worker plugin detects and bundles this file for Service Worker deployment.
 *
 * @module service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { initServiceWorker } from './service-worker-core'

// oxlint-disable-next-line typescript/no-floating-promises -- ignore for initialization timing
initServiceWorker()

export {}
