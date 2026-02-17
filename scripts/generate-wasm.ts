import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from 'watr'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const wat = readFileSync(
  path.resolve(__dirname, '../packages/unplugin-service-worker/e2e/playground/add.wat'),
  'utf-8'
)
const wasm = compile(wat)
writeFileSync(
  path.resolve(__dirname, '../packages/unplugin-service-worker/e2e/playground/add.wasm'),
  Buffer.from(wasm)
)
console.log('Generated add.wasm')
