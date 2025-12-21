// import { parseSync } from 'oxc-parser'
import { loadParser } from './parser'

const { parseSync } = await loadParser()
const code = `
function hello() {
  console.log("Hello, world!");
}
`
const result = parseSync('test.js', code)
console.log('parseSync result:', result.program, result.module)

if (globalThis.window) {
  document.querySelector('#code').innerHTML = JSON.stringify(result.program, null, 2)
}
