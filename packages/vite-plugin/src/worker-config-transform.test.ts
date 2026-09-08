import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { DEFINE_CONFIG_ID, transformConfigModule } from './worker-config-transform.ts'

const directories: string[] = []

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'vrowzer-config-transform-')))
  directories.push(root)
  mkdirSync(join(root, 'other'))
  writeFileSync(join(root, 'data.txt'), 'inlined text')
  writeFileSync(join(root, 'other/data.json'), '{"from":"other"}')
  const addDependency = vi.fn<(path: string) => void>()
  const options = {
    filename: join(root, 'worker.ts'),
    sourceDirectory: root,
    local: true,
    strict: true,
    addDependency
  }
  return { root, options, addDependency }
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('worker config static file transforms', () => {
  test('isolates the Vite identity helper while retaining other imports and runtime references', () => {
    const { options } = fixture()
    const code = transformConfigModule(
      `
      import { defineConfig as config, version as viteVersion, type UserConfig } from 'vite'
      export const factory = config
      export default config({ define: { version: viteVersion } } satisfies UserConfig)
    `,
      options
    )!.code
    expect(code).toContain('import { version as viteVersion, type UserConfig } from "vite"')
    expect(code).toContain(
      `import { defineConfig as config } from ${JSON.stringify(DEFINE_CONFIG_ID)}`
    )
    expect(code).toContain('export const factory = config')
    expect(code).toContain('export default config(')
  })

  test('keeps mixed import bindings and runtime reads while inlining a module-level read', () => {
    const { root, options, addDependency } = fixture()
    const source = `
      import { readFileSync as read, existsSync } from 'node:fs'
      import { resolve, basename } from 'node:path'
      export const text = read(resolve(import.meta.dirname, 'data.txt'), 'utf8')
      export const runtime = file => read(file, 'utf8')
      export const other = () => [existsSync('virtual.txt'), basename('/virtual.txt')]
    `
    const result = transformConfigModule(source, options)!
    expect(result.code).toContain('readFileSync as read, existsSync')
    expect(result.code).toContain('resolve, basename')
    expect(result.code).toContain('"inlined text"')
    expect(result.code).toContain("read(file, 'utf8')")
    expect(addDependency).toHaveBeenCalledExactlyOnceWith(join(root, 'data.txt'))
    expect(result.map.sourcesContent).toEqual([source])
  })

  test('supports a static URL relative to this module and preserves its original location', () => {
    const { options } = fixture()
    const source = `
      import { readFileSync } from 'node:fs'
      export const text = readFileSync(new URL('./data.txt', import.meta.url), 'utf8')
      export const url = import.meta.url
      export const filename = import.meta.filename
    `
    const code = transformConfigModule(source, options)!.code
    expect(code).toContain('"inlined text"')
    expect(code).toContain(JSON.stringify(pathToFileURL(options.filename).href))
    expect(code).toContain(JSON.stringify(options.filename))
  })

  test('resolves createRequire JSON from its static anchor', () => {
    const { root, options, addDependency } = fixture()
    const anchor = join(root, 'other/anchor.mjs')
    const code = transformConfigModule(
      `
      import { createRequire as from } from 'node:module'
      export const json = from(${JSON.stringify(anchor)})('./data.json')
    `,
      options
    )!.code
    expect(code).toContain('{"from":"other"}')
    expect(addDependency).toHaveBeenCalledExactlyOnceWith(join(root, 'other/data.json'))
  })

  test.each([
    `import { createRequire } from 'node:module'; export const data = createRequire(dynamicPath())('./data.json')`,
    `import { readFileSync } from 'unrelated'; export const text = readFileSync('data.txt', 'utf8')`,
    `import { readFileSync } from 'node:fs'; export const fn = readFileSync => readFileSync('data.txt', 'utf8')`,
    `import { readFileSync } from 'node:fs'; for (const readFileSync of readers) readFileSync('data.txt', 'utf8')`,
    `import { readFileSync } from 'node:fs'; import { resolve } from 'node:path'; const __dirname = '/elsewhere'; export const text = readFileSync(resolve(__dirname, 'data.txt'), 'utf8')`
  ])('does not inline unsupported or shadowed reads: %s', source => {
    const { options, addDependency } = fixture()
    expect(transformConfigModule(source, options)).toBeUndefined()
    expect(addDependency).not.toHaveBeenCalled()
  })

  test('does not mistake a local URL constructor for the platform URL', () => {
    const { options, addDependency } = fixture()
    const source = `
      import { readFileSync } from 'node:fs'
      const URL = OtherURL
      export const text = readFileSync(new URL('./data.txt', import.meta.url), 'utf8')
    `
    expect(transformConfigModule(source, options)!.code).toContain(
      "readFileSync(new URL('./data.txt',"
    )
    expect(addDependency).not.toHaveBeenCalled()
  })

  test('keeps third-party import.meta asset URLs untouched', () => {
    const { options } = fixture()
    expect(
      transformConfigModule(`export const asset = new URL('./asset.wasm', import.meta.url)`, {
        ...options,
        local: false
      })
    ).toBeUndefined()
  })

  test('tracks missing static files before reporting an error', () => {
    const { root, options, addDependency } = fixture()
    const source = `import { readFileSync } from 'node:fs'; export const text = readFileSync('./missing.txt', 'utf8')`
    expect(() => transformConfigModule(source, options)).toThrow(
      `Cannot read workerConfig dependency ${join(root, 'missing.txt')}`
    )
    expect(addDependency).toHaveBeenCalledWith(join(root, 'missing.txt'))
  })

  test('tracks a missing JSON file before createRequire resolution fails', () => {
    const { root, options, addDependency } = fixture()
    const source = `import { createRequire } from 'node:module'; export const json = createRequire(import.meta.url)('./missing.json')`
    expect(() => transformConfigModule(source, options)).toThrow('Cannot inline ./missing.json')
    expect(addDependency).toHaveBeenCalledExactlyOnceWith(join(root, 'missing.json'))
  })
})
