import { describe, expect, it } from 'vitest'
import { wasmUrlPlugin } from '../index.ts'

describe('wasmUrlPlugin', () => {
  it('should return a plugin with correct name', () => {
    const plugin = wasmUrlPlugin()
    expect(plugin.name).toBe('unplugin-service-worker:wasm-url')
  })

  it('should have a transform hook with .wasm + import.meta.url filter', () => {
    const plugin = wasmUrlPlugin()
    const transform = plugin.transform as { filter: { code: RegExp } }
    expect(transform.filter.code.test('.wasm"  import.meta.url')).toBe(true)
    expect(transform.filter.code.test('const x = 1;')).toBe(false)
  })

  it('should replace new URL("*.wasm", import.meta.url) with self.location.href', () => {
    const plugin = wasmUrlPlugin()
    const transform = plugin.transform as { handler: (code: string) => { code: string } | null }
    const input = 'var url = new URL("module.wasm", import.meta.url);'
    const result = transform.handler.call({}, input)
    expect(result).not.toBeNull()
    expect(result!.code).toBe('var url = new URL("module.wasm", self.location.href);')
  })

  it('should handle single-quoted paths', () => {
    const plugin = wasmUrlPlugin()
    const transform = plugin.transform as { handler: (code: string) => { code: string } | null }
    const input = "var url = new URL('module.wasm', import.meta.url);"
    const result = transform.handler.call({}, input)
    expect(result).not.toBeNull()
    expect(result!.code).toBe('var url = new URL("module.wasm", self.location.href);')
  })

  it('should handle relative paths', () => {
    const plugin = wasmUrlPlugin()
    const transform = plugin.transform as { handler: (code: string) => { code: string } | null }
    const input = 'var url = new URL("./path/to/module.wasm", import.meta.url);'
    const result = transform.handler.call({}, input)
    expect(result).not.toBeNull()
    expect(result!.code).toBe('var url = new URL("./path/to/module.wasm", self.location.href);')
  })

  it('should return null when no WASM URL pattern found', () => {
    const plugin = wasmUrlPlugin()
    const transform = plugin.transform as { handler: (code: string) => { code: string } | null }
    const result = transform.handler.call({}, 'const x = 1;')
    expect(result).toBeNull()
  })

  it('should not modify non-WASM URL patterns', () => {
    const plugin = wasmUrlPlugin()
    const transform = plugin.transform as { handler: (code: string) => { code: string } | null }
    const input = 'var url = new URL("module.js", import.meta.url);'
    const result = transform.handler.call({}, input)
    expect(result).toBeNull()
  })
})
