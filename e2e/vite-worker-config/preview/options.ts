import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

export const compilerOptions = createRequire(import.meta.url)('./compiler-options.json')
export const marker = readFileSync(new URL('./marker.txt', import.meta.url), 'utf8').trim()
