// import { parseSync } from 'oxc-parser'
import { loadParser } from './parser'

import type { Program } from '@oxc-project/types'

const { parseSync } = await loadParser()
const code = `
function hello() {
  console.log("Hello, world!");
}
`
const result = parseSync('test.js', code)
console.log('parseSync result:', result)
const program = JSON.parse(result.program) as { node: Program }
console.log('AST Object:', program.node)

if (globalThis.window) {
  document.querySelector('#code').innerHTML = JSON.stringify(program, null, 2)
}
