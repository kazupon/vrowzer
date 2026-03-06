/**
 * Service Worker entry point for vrowser preview system.
 *
 * This file is NOT bundled by vrowser's build. It is exported as TypeScript source
 * and bundled by the user's Vite + Vrowser (which provides resolve.alias for node:* polyfills).
 * The unplugin-service-worker plugin detects and bundles this file for Service Worker deployment.
 *
 * @module service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { initServiceWorker } from './service-worker-core'

// eslint-disable-next-line no-floating-promises -- ignore for initialization timing
initServiceWorker()

export {}
