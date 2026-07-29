import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const fsPromises = vi.hoisted(() => ({
  readFile: vi.fn<(filePath: string, encoding: string) => Promise<string>>(),
  realpath: vi.fn<(filePath: string) => Promise<string>>(),
}))

vi.mock('node:fs/promises', () => ({
  default: fsPromises,
}))

import type { Logger } from '../logger'
import { isWindows } from '../../shared/utils'
import {
  extractSourcemapFromFile,
  genSourceMapUrl,
  getCodeWithSourcemap,
  getNodeModulesPackageRoot,
  injectSourcesContent,
} from './sourcemap'

import type { SourceMap } from 'rolldown'

function createLogger() {
  return {
    warnOnce: vi.fn<(message: string) => void>(),
  } as unknown as Logger
}

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

beforeEach(() => {
  vi.clearAllMocks()
  fsPromises.realpath.mockImplementation(async (filePath: string) => filePath)
  fsPromises.readFile.mockRejectedValue(new Error('ENOENT'))
})

describe('getNodeModulesPackageRoot', () => {
  const cases = [
    {
      name: 'returns undefined for path outside node_modules',
      input: '/project/src/foo.ts',
      expected: undefined,
    },
    {
      name: 'returns undefined for plain filename',
      input: 'foo.js',
      expected: undefined,
    },
    {
      name: 'unscoped package',
      input: '/project/node_modules/foo/index.js',
      expected: '/project/node_modules/foo',
    },
    {
      name: 'unscoped package in nested directory',
      input: '/project/node_modules/foo/dist/bar.js',
      expected: '/project/node_modules/foo',
    },
    {
      name: 'scoped package',
      input: '/project/node_modules/@scope/pkg/dist/foo.js',
      expected: '/project/node_modules/@scope/pkg',
    },
    {
      name: 'scoped package at root level',
      input: '/project/node_modules/@scope/pkg/index.js',
      expected: '/project/node_modules/@scope/pkg',
    },
    {
      name: 'nested node_modules uses the last segment',
      input: '/project/node_modules/foo/node_modules/bar/index.js',
      expected: '/project/node_modules/foo/node_modules/bar',
    },
    {
      name: 'package name without subdirectory',
      input: '/project/node_modules/foo',
      expected: '/project/node_modules/foo',
    },
    {
      name: 'scoped package name without subdirectory',
      input: '/project/node_modules/@scope/pkg',
      expected: '/project/node_modules/@scope/pkg',
    },
  ]

  it.each(cases)('$name', ({ input, expected }) => {
    expect(getNodeModulesPackageRoot(input)).toBe(expected)
  })

  it.skipIf(!isWindows)('normalizes a Windows-style package path', () => {
    expect(
      getNodeModulesPackageRoot(
        'D:\\project\\node_modules\\foo\\dist\\bar.js',
      ),
    ).toBe('D:/project/node_modules/foo')
  })

  it.skipIf(!isWindows)(
    'normalizes a Windows-style scoped package path',
    () => {
      expect(
        getNodeModulesPackageRoot(
          'D:\\project\\node_modules\\@scope\\pkg\\index.js',
        ),
      ).toBe('D:/project/node_modules/@scope/pkg')
    },
  )
})

describe('injectSourcesContent', () => {
  it('reads sources inside a dependency package and blocks sources outside it', async () => {
    const logger = createLogger()
    const map = {
      sources: ['src/index.ts', '../../secret.txt'],
      sourceRoot: '..',
    }

    fsPromises.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === '/project/node_modules/example/src/index.ts') {
        return 'export const value = 1'
      }
      if (filePath === '/project/secret.txt') {
        return 'secret'
      }
      throw new Error('ENOENT')
    })

    await injectSourcesContent(
      map,
      '/project/node_modules/example/dist/index.js',
      logger,
    )

    expect(map.sourcesContent).toEqual(['export const value = 1', null])
    expect(fsPromises.readFile).toHaveBeenCalledTimes(1)
    expect(fsPromises.readFile).toHaveBeenCalledWith(
      '/project/node_modules/example/src/index.ts',
      'utf-8',
    )
    expect(fsPromises.readFile).not.toHaveBeenCalledWith(
      '/project/secret.txt',
      'utf-8',
    )
    expect(logger.warnOnce).toHaveBeenCalledWith(
      expect.stringContaining('points to a source file outside its package'),
    )
  })

  it('does not apply the dependency package boundary to project sources', async () => {
    const logger = createLogger()
    const map = {
      sources: ['../../shared.ts'],
    }

    fsPromises.readFile.mockResolvedValue('export const shared = true')

    await injectSourcesContent(map, '/project/src/index.js', logger)

    expect(map.sourcesContent).toEqual(['export const shared = true'])
    expect(fsPromises.readFile).toHaveBeenCalledWith('/shared.ts', 'utf-8')
    expect(logger.warnOnce).not.toHaveBeenCalled()
  })
})

describe('extractSourcemapFromFile', () => {
  const sourceMap: SourceMap = {
    version: 3,
    sources: ['index.ts'],
    sourcesContent: ['export const value = 1'],
    names: [],
    mappings: 'AAAA',
  }

  it('reads an external sourcemap inside a dependency package', async () => {
    const logger = createLogger()
    fsPromises.readFile.mockResolvedValue(JSON.stringify(sourceMap))

    const result = await extractSourcemapFromFile(
      'export const value = 1\n//# sourceMappingURL=index.js.map',
      '/project/node_modules/example/dist/index.js',
      logger,
    )

    expect(result?.map).toEqual(sourceMap)
    expect(fsPromises.readFile).toHaveBeenCalledWith(
      '/project/node_modules/example/dist/index.js.map',
      'utf-8',
    )
    expect(logger.warnOnce).not.toHaveBeenCalled()
  })

  it('blocks an external sourcemap outside a dependency package', async () => {
    const logger = createLogger()

    const result = await extractSourcemapFromFile(
      'export const value = 1\n//# sourceMappingURL=../../../secret.map',
      '/project/node_modules/example/dist/index.js',
      logger,
    )

    expect(result?.map).toEqual({})
    expect(fsPromises.readFile).not.toHaveBeenCalled()
    expect(logger.warnOnce).toHaveBeenCalledWith(
      expect.stringContaining('references a map file outside its package'),
    )
  })

  it('does not apply the dependency package boundary to a project sourcemap', async () => {
    const logger = createLogger()
    fsPromises.readFile.mockResolvedValue(JSON.stringify(sourceMap))

    const result = await extractSourcemapFromFile(
      'export const value = 1\n//# sourceMappingURL=../../shared.map',
      '/project/src/index.js',
      logger,
    )

    expect(result?.map).toEqual(sourceMap)
    expect(fsPromises.readFile).toHaveBeenCalledWith('/shared.map', 'utf-8')
    expect(logger.warnOnce).not.toHaveBeenCalled()
  })
})

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
