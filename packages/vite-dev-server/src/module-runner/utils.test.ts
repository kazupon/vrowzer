import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

const originalBuffer = globalThis.Buffer
const sourceMap = JSON.stringify({
  version: 3,
  sources: ['日本語のsource.ts'],
  names: [],
  mappings: 'AAAA',
})
const encodedSourceMap = originalBuffer.from(sourceMap).toString('base64')

afterEach(() => {
  globalThis.Buffer = originalBuffer
  vi.resetModules()
})

describe('decodeBase64', () => {
  it('decodes non-ASCII UTF-8 without Buffer', async () => {
    Reflect.deleteProperty(globalThis, 'Buffer')
    vi.resetModules()

    const { decodeBase64 } = await import('./utils')

    expect(decodeBase64(encodedSourceMap)).toBe(sourceMap)
  })

  it('keeps decoding after globalThis.Buffer is removed', async () => {
    vi.resetModules()
    const { decodeBase64 } = await import('./utils')

    Reflect.deleteProperty(globalThis, 'Buffer')

    expect(decodeBase64(encodedSourceMap)).toBe(sourceMap)
  })
})
