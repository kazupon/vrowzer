/**
 * @vrowser/oxc-parser E2E Test Entry Point
 *
 * This file is loaded in the browser via Vite dev server.
 */

import { init, parse, parseSync } from '../js/index.ts'

import type { ParseResult } from '../js/types.ts'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    oxcParser: {
      init: typeof init
      parse: typeof parse
      parseSync: typeof parseSync
    }
  }
}

window.oxcParser = { init, parse, parseSync }

const statusEl = document.getElementById('status')!

async function setup() {
  try {
    // Initialize WASM
    await init()

    // Sanity check
    const result: ParseResult = parseSync('test.js', 'const x = 1;')
    if (result.program.type !== 'Program') {
      throw new Error('Parser sanity check failed')
    }

    statusEl.textContent = 'ready'
  } catch (e) {
    statusEl.textContent = `error: ${(e as Error).message}`
    console.error('Init error:', e)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
setup()
