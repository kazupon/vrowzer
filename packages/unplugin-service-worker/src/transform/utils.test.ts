import MagicString from 'magic-string'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import {
  detectAndResolveServiceWorkers,
  generateTransformResult,
  needsTransform,
  replaceUrlExpression,
  resolveServiceWorkerPath
} from './utils.ts'

describe('needsTransform', () => {
  it('should return true when code contains createSvcWorkerController', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    expect(needsTransform(code)).toBe(true)
  })

  it('should return false when code does not contain createSvcWorkerController', () => {
    const code = `new Worker('./worker.js')`
    expect(needsTransform(code)).toBe(false)
  })
})

describe('resolveServiceWorkerPath', () => {
  it('should resolve relative path', () => {
    const result = resolveServiceWorkerPath('./sw.js', '/project/src/main.ts')
    expect(result).toBe(path.resolve('/project/src', 'sw.js'))
  })

  it('should resolve parent relative path', () => {
    const result = resolveServiceWorkerPath('../sw.js', '/project/src/main.ts')
    expect(result).toBe(path.resolve('/project', 'sw.js'))
  })

  it('should keep absolute path', () => {
    const result = resolveServiceWorkerPath('/sw.js', '/project/src/main.ts')
    expect(result).toBe('/sw.js')
  })

  it('should resolve module-like path as relative', () => {
    const result = resolveServiceWorkerPath('sw.js', '/project/src/main.ts')
    expect(result).toBe(path.resolve('/project/src', 'sw.js'))
  })
})

describe('detectAndResolveServiceWorkers', () => {
  it('should detect and resolve single Service Worker', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const id = '/project/src/main.ts'
    const result = detectAndResolveServiceWorkers(code, id)

    expect(result).toHaveLength(1)
    expect(result[0]!.urlPath).toBe('./sw.js')
    expect(result[0]!.filePath).toBe(path.resolve('/project/src', 'sw.js'))
    expect(result[0]!.detected.urlExpression).toBe("new URL('./sw.js', import.meta.url)")
  })

  it('should detect and resolve multiple Service Workers', () => {
    const code = `
      createSvcWorkerController({ scriptURL: new URL('./sw1.js', import.meta.url) })
      createSvcWorkerController({ scriptURL: new URL('./sw2.js', import.meta.url) })
    `
    const id = '/project/src/main.ts'
    const result = detectAndResolveServiceWorkers(code, id)

    expect(result).toHaveLength(2)
    expect(result[0]!.urlPath).toBe('./sw1.js')
    expect(result[1]!.urlPath).toBe('./sw2.js')
  })

  it('should return empty array when no Service Workers detected', () => {
    const code = `new Worker('./worker.js')`
    const result = detectAndResolveServiceWorkers(code, '/project/src/main.ts')

    expect(result).toHaveLength(0)
  })
})

describe('generateTransformResult', () => {
  it('should generate transform result with code and map', () => {
    const s = new MagicString('hello world')
    s.update(0, 5, 'HELLO')

    const result = generateTransformResult(s, '/project/src/main.ts')

    expect(result.code).toBe('HELLO world')
    expect(result.map).toBeDefined()
    expect(result.map.sources).toBeDefined()
    expect(result.map.sources.length).toBeGreaterThan(0)
  })
})

describe('replaceUrlExpression', () => {
  it('should replace URL expression with new URL', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const id = '/project/src/main.ts'
    const resolved = detectAndResolveServiceWorkers(code, id)

    expect(resolved).toHaveLength(1)
    const s = new MagicString(code)
    replaceUrlExpression(s, resolved[0]!.detected, './sw.js?sw=test')

    expect(s.toString()).toContain(
      `new URL(/* @vite-ignore */ "./sw.js?sw=test", '' + import.meta.url)`
    )
  })
})
