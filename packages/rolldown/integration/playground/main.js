/**
 * E2E test page for @vrowzer/rolldown
 *
 * Imports pre-bundled rolldown and runs a bundling operation in the browser.
 * Results are exposed via window.testState for Playwright assertions.
 */

// These imports work because @vrowzer/rolldown pre-bundles all dependencies
import { rolldown } from '@vrowzer/rolldown/browser'
import { memfs } from '@vrowzer/rolldown/browser/experimental'

window.testState = { status: 'initializing', result: null, error: null }

async function run() {
  try {
    document.getElementById('status').textContent = 'bundling'

    // Populate virtual filesystem
    memfs.volume.reset()
    memfs.volume.fromJSON({
      '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
      '/src/math.js': 'export function add(a, b) { return a + b }'
    })

    // Run rolldown in the browser
    const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
    const { output } = await bundle.generate({ format: 'esm' })

    const code = output[0].code

    window.testState = {
      status: 'success',
      result: { code, fileName: output[0].fileName },
      error: null
    }

    document.getElementById('status').textContent = 'success'
    document.getElementById('result').textContent = code
  } catch (e) {
    window.testState = {
      status: 'error',
      result: null,
      error: e.message
    }
    document.getElementById('status').textContent = `error: ${e.message}`
    console.error('Rolldown E2E error:', e)
  }
}

run()
