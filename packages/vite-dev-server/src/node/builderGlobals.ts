/**
 * Globals that the rolldown binding needs in the build Worker
 *
 * The binding (emnapi) looks for `Buffer` when it is initialized, and creates Node.js Buffers for
 * binary outputs, e.g. emitted assets. The builder entry imports this module first, so that it is
 * evaluated before the binding.
 *
 * @module node/builderGlobals
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Buffer } from 'node:buffer'

;(globalThis as { Buffer?: unknown }).Buffer ??= Buffer
