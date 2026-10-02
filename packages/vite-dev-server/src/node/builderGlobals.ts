/**
 * SPIKE (#36): globals that the rolldown binding needs in the build Worker.
 *
 * The binding (emnapi) detects `Buffer` when it is initialized, and creates Node.js Buffers for
 * binary outputs, e.g. emitted assets. This module must be evaluated before the binding.
 *
 * @module node/builderGlobals
 */

import { Buffer } from 'node:buffer'

;(globalThis as { Buffer?: unknown }).Buffer ??= Buffer
