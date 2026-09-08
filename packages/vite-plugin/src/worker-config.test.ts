import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vite-plus/test'
import { validateWorkerConfigFile, validateWorkerConfigSource } from './worker-config.ts'

describe('worker config validation', () => {
  test.each([
    'export default {}',
    'export default { plugins: [...plugins, enabled && plugin(options)], define: { fn: () => 1 } }',
    'import { defineConfig } from "vite"; export default defineConfig({ plugins: [] })',
    'import { defineConfig as config } from "vite"; export default config({})',
    'const config = {} satisfies UserConfig; export default config',
    'const original = {}; const config = original; export default config as UserConfig',
    'import { defineConfig } from "vite"; const config = {}; export default defineConfig(config)',
    'export const config = {}; export default config'
  ])('accepts %s without evaluating the module', source => {
    expect(() => validateWorkerConfigSource(source, '/host/worker.ts')).not.toThrow()
  })

  test.each([
    'export default () => ({})',
    'import { defineConfig } from "vite"; export default defineConfig(() => ({}))',
    'import { defineConfig } from "vite"; export default defineConfig(Promise.resolve({}))',
    'import { defineConfig } from "other"; export default defineConfig({})',
    'import type { defineConfig } from "vite"; export default defineConfig({})',
    'export default []',
    'export default null',
    'export default Promise.resolve({})',
    'export default makeConfig()',
    'export { default } from "./other.ts"',
    'const a = b; const b = a; export default a',
    'let config = {}; export default config',
    'export default {',
    'const config = {}'
  ])('rejects %s', source => {
    expect(() => validateWorkerConfigSource(source, '/host/worker.ts')).toThrow(
      'Invalid workerConfig /host/worker.ts'
    )
  })

  const directories: string[] = []
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('checks the file before bundling', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vrowzer-config-'))
    directories.push(directory)
    expect(() => validateWorkerConfigFile(directory)).toThrow('not a readable file')
    expect(() => validateWorkerConfigFile(join(directory, 'missing.ts'))).toThrow(
      'not a readable file'
    )
    const entry = join(directory, 'worker.ts')
    writeFileSync(entry, 'throw new Error("must not execute on host"); export default {}')
    expect(() => validateWorkerConfigFile(entry)).not.toThrow()
    const unsupported = join(directory, 'worker.cjs')
    writeFileSync(unsupported, 'module.exports = {}')
    expect(() => validateWorkerConfigFile(unsupported)).toThrow('ESM')
  })
})
