/**
 * @vrowzer/fs E2E Test Entry Point
 *
 * This file is loaded in the browser via Vite dev server.
 */

import * as fs from '../src/index.ts'
import * as promises from '../src/promises.ts'

// Expose modules globally for testing
declare global {
  interface Window {
    fs: typeof fs
    fsPromises: typeof promises
    testState: {
      ready: boolean
      error: string | null
    }
  }
}

window.fs = fs
window.fsPromises = promises
window.testState = {
  ready: false,
  error: null
}

async function init() {
  const statusEl = document.getElementById('status')

  try {
    // Reset filesystem
    fs.vol.reset()

    // Basic sanity check
    fs.writeFileSync('/init-test.txt', 'initialized')
    const content = fs.readFileSync('/init-test.txt', 'utf8')

    if (content !== 'initialized') {
      throw new Error('Filesystem sanity check failed')
    }

    fs.vol.reset()
    window.testState.ready = true
    statusEl!.textContent = 'ready'
  } catch (error) {
    window.testState.error = (error as Error).message
    statusEl!.textContent = `error: ${(error as Error).message}`
    console.error('Init error:', error)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
init()
