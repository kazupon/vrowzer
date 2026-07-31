/**
 * E2E test page for @vrowzer/rolldown/utils
 *
 * Tests transformSync, parseSync, and minifySync in a browser environment.
 * Results are exposed via window.testState for Playwright assertions.
 */

import { transformSync, parseSync, minifySync } from '@vrowzer/rolldown/utils'

window.testState = { status: 'initializing', result: null, error: null }

async function run() {
  try {
    document.getElementById('status').textContent = 'testing'

    // Test 1: transformSync with TypeScript code
    const tsCode = `
const greeting: string = 'hello'
const add = (a: number, b: number): number => a + b
console.log(greeting, add(1, 2))
`
    const transformResult = transformSync('test.ts', tsCode, {
      lang: 'ts',
      sourceType: 'module'
    })

    // Test 2: transformSync define replacement
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

    // Test 3: transformSync with custom JSX options and tsconfig disabled
    const jsxCode = `
export const pages = import.meta.glob('./pages/*.tsx')
export default <div />
`
    const jsxResult = transformSync('entry-glob-custom-oxc.tsx', jsxCode, {
      lang: 'tsx',
      sourceType: 'module',
      tsconfig: false,
      jsx: {
        runtime: 'automatic',
        importSource: 'vue',
        development: true
      }
    })

    // Test 4: parseSync
    const parseCode = `const x = 1; export default x;`
    const parseResult = parseSync('parse-test.js', parseCode)

    // Test 5: minifySync
    const minifyCode = `/* comment */ const longVariable = 1;\nconsole.log(longVariable);`
    const minifyResult = minifySync('minify-test.js', minifyCode)

    window.testState = {
      status: 'success',
      result: {
        // transformSync: TypeScript
        tsOutput: transformResult.code,
        tsHasTypes: tsCode.includes(': string'),
        tsOutputNoTypes: !transformResult.code.includes(': string'),
        // transformSync: Define replacement
        defineOutput: defineResult.code,
        defineReplaced: !defineResult.code.includes('process.env.NODE_ENV'),
        // transformSync: Custom JSX options
        jsxOutput: jsxResult.code,
        jsxNoErrors: jsxResult.errors.length === 0,
        jsxUsesVueRuntime: jsxResult.code.includes('vue/jsx-dev-runtime'),
        jsxAvoidsReactRuntime: !jsxResult.code.includes('react/jsx'),
        jsxKeepsGlob: jsxResult.code.includes('import.meta.glob'),
        // parseSync
        parseHasProgram: parseResult.program != null,
        parseBodyLength: parseResult.program?.body?.length ?? 0,
        parseNoErrors: parseResult.errors.length === 0,
        // minifySync
        minifyOutput: minifyResult.code,
        minifyRemovesComments: !minifyResult.code.includes('/* comment */'),
        minifyShorter: minifyResult.code.length < minifyCode.length
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
    console.error('utils E2E error:', e)
  }
}

run()
