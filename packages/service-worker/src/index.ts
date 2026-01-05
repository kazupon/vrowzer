/**
 * Service Worker library
 *
 * @module service-worker
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createEmitter } from '@kazupon/jts-utils'

const emitter = createEmitter()

console.log('Service Worker Loaded', emitter)
