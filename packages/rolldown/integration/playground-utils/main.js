/**
 * E2E test page for @vrowser/rolldown/utils
 *
 * Tests transformSync in a browser environment.
 * Results are exposed via window.testState for Playwright assertions.
 */

import { transformSync } from '@vrowser/rolldown/utils'

window.testState = { status: 'initializing', result: null, error: null }

async function run() {
  try {
    document.getElementById('status').textContent = 'transforming'

    // Test transformSync with TypeScript code
    const tsCode = `
const greeting: string = 'hello'
const add = (a: number, b: number): number => a + b
console.log(greeting, add(1, 2))
`
    const result = transformSync('test.ts', tsCode, {
      lang: 'ts',
      sourceType: 'module'
    })

    // Test define replacement
    const defineCode = `
if (process.env.NODE_ENV !== 'production') {
  console.log('dev mode')
}
`
    const defineResult = transformSync('define-test.js', defineCode, {
      lang: 'js',
      sourceType: 'module',
      define: {
        'process.env.NODE_ENV': JSON.stringify('development')
      }
    })

    window.testState = {
      status: 'success',
      result: {
        // TypeScript transform
        tsOutput: result.code,
        tsHasTypes: tsCode.includes(': string'),
        tsOutputNoTypes: !result.code.includes(': string'),
        // Define replacement — process.env.NODE_ENV should be replaced (not present in output)
        defineOutput: defineResult.code,
        defineReplaced: !defineResult.code.includes('process.env.NODE_ENV')
      },
      error: null
    }

    document.getElementById('status').textContent = 'success'
    document.getElementById('result').textContent = JSON.stringify(window.testState.result, null, 2)
  } catch (e) {
    window.testState = {
      status: 'error',
      result: null,
      error: e.message
    }
    document.getElementById('status').textContent = `error: ${e.message}`
    console.error('transformSync E2E error:', e)
  }
}

run()
