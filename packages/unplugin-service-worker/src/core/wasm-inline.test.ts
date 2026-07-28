import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { inlineWasmInCode, wasmInlinePlugin } from '../index.ts'

describe('wasmInlinePlugin', () => {
  it('should return a plugin with correct name', () => {
    const plugin = wasmInlinePlugin()
    expect(plugin.name).toBe('unplugin-service-worker:wasm-inline')
  })

  it('should have a transform hook with .wasm + import.meta.url filter', () => {
    const plugin = wasmInlinePlugin()
    const transform = plugin.transform as { filter: { code: RegExp } }
    expect(transform.filter.code.test('.wasm"  import.meta.url')).toBe(true)
    expect(transform.filter.code.test("new URL('mod.wasm', import.meta.url)")).toBe(true)
    expect(transform.filter.code.test('const x = 1;')).toBe(false)
  })

  it('should collect WASM file paths during transform', () => {
    const plugin = wasmInlinePlugin()
    const transform = plugin.transform as {
      handler: (code: string, id: string) => null
    }
    const fixtureDir = path.resolve(__dirname, '__fixtures__')
    const input = 'var url = new URL("minimal.wasm", import.meta.url);'
    // transform collects paths but returns null (inlining happens in post-process)
    const result = transform.handler.call({}, input, path.join(fixtureDir, 'test.js'))
    expect(result).toBeNull()

    // Verify WASM path was collected
    const wasmFiles = (plugin as unknown as { _wasmFiles: Map<string, string> })._wasmFiles
    expect(wasmFiles.size).toBe(1)
    expect(wasmFiles.has('minimal.wasm')).toBe(true)
  })

  it('should not collect when no WASM URL pattern found', () => {
    const plugin = wasmInlinePlugin()
    const transform = plugin.transform as {
      handler: (code: string, id: string) => null
    }
    transform.handler.call({}, 'const x = 1;', '/path/test.js')

    const wasmFiles = (plugin as unknown as { _wasmFiles: Map<string, string> })._wasmFiles
    expect(wasmFiles.size).toBe(0)
  })
})

describe('inlineWasmInCode', () => {
  it('should replace new URL("*.wasm", {}.url) with base64 data URL', async () => {
    const fixtureDir = path.resolve(__dirname, '__fixtures__')
    const wasmFiles = new Map([['minimal.wasm', path.join(fixtureDir, 'minimal.wasm')]])

    const input = 'var url = new URL("minimal.wasm", {}.url);'
    const result = await inlineWasmInCode(input, wasmFiles)
    expect(result).toMatch(/^var url = "data:application\/wasm;base64,/)
    expect(result).not.toContain('{}.url')
  })

  it('should replace new URL("*.wasm", import.meta.url) pattern too', async () => {
    const fixtureDir = path.resolve(__dirname, '__fixtures__')
    const wasmFiles = new Map([['minimal.wasm', path.join(fixtureDir, 'minimal.wasm')]])

    const input = 'var url = new URL("minimal.wasm", import.meta.url);'
    const result = await inlineWasmInCode(input, wasmFiles)
    expect(result).toMatch(/^var url = "data:application\/wasm;base64,/)
  })

  it('should return code unchanged when no WASM files collected', async () => {
    const wasmFiles = new Map<string, string>()
    const input = 'const x = 1;'
    const result = await inlineWasmInCode(input, wasmFiles)
    expect(result).toBe(input)
  })

  it('should skip when WASM file does not exist on disk', async () => {
    const wasmFiles = new Map([['nonexistent.wasm', '/tmp/nonexistent.wasm']])
    const input = 'var url = new URL("nonexistent.wasm", {}.url);'
    const result = await inlineWasmInCode(input, wasmFiles)
    expect(result).toBe(input)
  })

  it('should skip patterns not in wasmFiles map', async () => {
    const wasmFiles = new Map([['other.wasm', '/tmp/other.wasm']])
    const input = 'var url = new URL("unknown.wasm", {}.url);'
    const result = await inlineWasmInCode(input, wasmFiles)
    expect(result).toBe(input)
  })
})
