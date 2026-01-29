import { describe, expect, it } from 'vitest'
import { genSourceMapUrl, getCodeWithSourcemap } from './sourcemap'

import type { SourceMap } from 'rolldown'

/**
 * Decode base64 to UTF-8 string (browser compatible)
 */
function base64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

describe('genSourceMapUrl', () => {
  it('should generate data URL from string', () => {
    const input = '{"version":3,"sources":[],"mappings":""}'
    const result = genSourceMapUrl(input)

    expect(result).toMatch(/^data:application\/json;base64,/)

    // Decode and verify
    const base64 = result.replace('data:application/json;base64,', '')
    const decoded = atob(base64)
    expect(decoded).toBe(input)
  })

  it('should generate data URL from SourceMap object', () => {
    const map: SourceMap = {
      version: 3,
      sources: ['test.js'],
      sourcesContent: ['const x = 1'],
      names: [],
      mappings: 'AAAA',
    }
    const result = genSourceMapUrl(map)

    expect(result).toMatch(/^data:application\/json;base64,/)

    // Decode and verify
    const base64 = result.replace('data:application/json;base64,', '')
    const decoded = atob(base64)
    expect(JSON.parse(decoded)).toEqual(map)
  })

  it('should handle empty mappings', () => {
    const map: SourceMap = {
      version: 3,
      sources: [],
      sourcesContent: [],
      names: [],
      mappings: '',
    }
    const result = genSourceMapUrl(map)

    expect(result).toMatch(/^data:application\/json;base64,/)

    const base64 = result.replace('data:application/json;base64,', '')
    const decoded = atob(base64)
    expect(JSON.parse(decoded)).toEqual(map)
  })

  it('should handle unicode characters in sources', () => {
    const map: SourceMap = {
      version: 3,
      sources: ['テスト.js'],
      sourcesContent: ['const 変数 = "日本語"'],
      names: ['変数'],
      mappings: 'AAAA',
    }
    const result = genSourceMapUrl(map)

    expect(result).toMatch(/^data:application\/json;base64,/)

    // Use UTF-8 aware decoder for unicode content
    const base64 = result.replace('data:application/json;base64,', '')
    const decoded = base64ToUtf8(base64)
    expect(JSON.parse(decoded)).toEqual(map)
  })

  it('should produce valid base64 output', () => {
    const input = 'test string'
    const result = genSourceMapUrl(input)

    const base64 = result.replace('data:application/json;base64,', '')
    // Valid base64 characters only
    expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/)
  })
})

describe('getCodeWithSourcemap', () => {
  const sampleMap: SourceMap = {
    version: 3,
    sources: ['test.js'],
    sourcesContent: ['const x = 1'],
    names: [],
    mappings: 'AAAA',
  }

  it('should append JS sourceMappingURL comment for js type', () => {
    const code = 'const x = 1;'
    const result = getCodeWithSourcemap('js', code, sampleMap)

    expect(result).toContain(code)
    expect(result).toContain('\n//# sourceMappingURL=data:application/json;base64,')
  })

  it('should append CSS sourceMappingURL comment for css type', () => {
    const code = '.foo { color: red; }'
    const result = getCodeWithSourcemap('css', code, sampleMap)

    expect(result).toContain(code)
    expect(result).toContain('\n/*# sourceMappingURL=data:application/json;base64,')
    expect(result).toContain(' */')
  })

  it('should preserve original code', () => {
    const code = 'function test() { return 42; }'
    const result = getCodeWithSourcemap('js', code, sampleMap)

    expect(result.startsWith(code)).toBe(true)
  })

  it('should include valid sourcemap data URL', () => {
    const code = 'const y = 2;'
    const result = getCodeWithSourcemap('js', code, sampleMap)

    // Extract the data URL
    const match = result.match(/sourceMappingURL=(data:application\/json;base64,[A-Za-z0-9+/=]+)/)
    expect(match).not.toBeNull()

    // Decode and verify
    const base64 = match![1]!.replace('data:application/json;base64,', '')
    const decoded = base64ToUtf8(base64)
    const parsedMap = JSON.parse(decoded)

    expect(parsedMap.version).toBe(3)
    expect(parsedMap.sources).toEqual(['test.js'])
    expect(parsedMap.mappings).toBe('AAAA')
  })

  it('should handle empty code', () => {
    const code = ''
    const result = getCodeWithSourcemap('js', code, sampleMap)

    expect(result).toContain('//# sourceMappingURL=')
  })

  it('should handle multiline code', () => {
    const code = `function foo() {
  return 1;
}

function bar() {
  return 2;
}`
    const result = getCodeWithSourcemap('js', code, sampleMap)

    expect(result.startsWith(code)).toBe(true)
    expect(result).toContain('\n//# sourceMappingURL=')
  })
})
