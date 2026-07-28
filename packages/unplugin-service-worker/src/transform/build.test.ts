import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createServiceWorkerCache } from '../core/cache.ts'
import {
  extractPlaceholderHashes,
  generatePlaceholder,
  generatePlaceholderHash,
  replacePlaceholders,
  transformBuild
} from './build.ts'

import type { ServiceWorkerCache } from '../core/cache.ts'

describe('generatePlaceholderHash', () => {
  it('should generate consistent hash for same path', () => {
    const hash1 = generatePlaceholderHash('/project/src/sw.js')
    const hash2 = generatePlaceholderHash('/project/src/sw.js')
    expect(hash1).toBe(hash2)
  })

  it('should generate different hashes for different paths', () => {
    const hash1 = generatePlaceholderHash('/project/src/sw1.js')
    const hash2 = generatePlaceholderHash('/project/src/sw2.js')
    expect(hash1).not.toBe(hash2)
  })

  it('should return alphanumeric string', () => {
    const hash = generatePlaceholderHash('/project/src/sw.js')
    expect(hash).toMatch(/^[a-z\d]+$/)
  })
})

describe('generatePlaceholder', () => {
  it('should generate placeholder with correct format', () => {
    const placeholder = generatePlaceholder('/project/src/sw.js')
    expect(placeholder).toMatch(/^__SW_ASSET__[a-z\d]+__$/)
  })
})

describe('transformBuild', () => {
  let cache: ServiceWorkerCache

  beforeEach(() => {
    cache = createServiceWorkerCache()
  })

  it('should transform Service Worker URL with placeholder', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const result = transformBuild(code, '/project/src/main.ts', { cache })

    expect(result).not.toBeNull()
    expect(result!.code).toMatch(/__SW_ASSET__[a-z\d]+__/)
    expect(result!.serviceWorkers).toHaveLength(1)
  })

  it('should use cached placeholder if bundle exists', () => {
    const swPath = '/project/src/sw.js'
    cache.saveBundle(swPath, [swPath], 'assets/sw-abc123.js', 'code', [])

    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const result = transformBuild(code, '/project/src/main.ts', { cache })

    expect(result).not.toBeNull()
    const cached = cache.getBundle(swPath)
    expect(result!.code).toContain(cached!.entryUrlPlaceholder)
  })

  it('should return Service Workers list for bundling', () => {
    const code = `
      createSvcWorkerController({ scriptURL: new URL('./sw1.js', import.meta.url) })
      createSvcWorkerController({ scriptURL: new URL('./sw2.js', import.meta.url) })
    `
    const result = transformBuild(code, '/project/src/main.ts', { cache })

    expect(result).not.toBeNull()
    expect(result!.serviceWorkers).toHaveLength(2)
    expect(result!.serviceWorkers[0]!.urlPath).toBe('./sw1.js')
    expect(result!.serviceWorkers[1]!.urlPath).toBe('./sw2.js')
  })

  it('should return null when no Service Workers detected', () => {
    const code = `new Worker('./worker.js')`
    const result = transformBuild(code, '/project/src/main.ts', { cache })

    expect(result).toBeNull()
  })
})

describe('replacePlaceholders', () => {
  let cache: ServiceWorkerCache

  beforeEach(() => {
    cache = createServiceWorkerCache()
  })

  it('should replace placeholder with actual URL', () => {
    const swPath = '/project/src/sw.js'
    const bundle = cache.saveBundle(swPath, [], 'assets/sw-abc123.js', 'code', [])

    const code = `new URL("${bundle.entryUrlPlaceholder}", import.meta.url)`
    const result = replacePlaceholders(code, cache)

    expect(result).not.toBeNull()
    expect(result).toContain('assets/sw-abc123.js')
    expect(result).not.toContain('__SW_ASSET__')
  })

  it('should prepend base URL', () => {
    const swPath = '/project/src/sw.js'
    const bundle = cache.saveBundle(swPath, [], 'assets/sw-abc123.js', 'code', [])

    const code = `new URL("${bundle.entryUrlPlaceholder}", import.meta.url)`
    const result = replacePlaceholders(code, cache, '/app/')

    expect(result).toContain('/app/assets/sw-abc123.js')
  })

  it('should handle base URL without trailing slash', () => {
    const swPath = '/project/src/sw.js'
    const bundle = cache.saveBundle(swPath, [], 'assets/sw-abc123.js', 'code', [])

    const code = `new URL("${bundle.entryUrlPlaceholder}", import.meta.url)`
    const result = replacePlaceholders(code, cache, '/app')

    expect(result).toContain('/app/assets/sw-abc123.js')
  })

  it('should return null when no placeholders in code', () => {
    const code = `new URL("./sw.js", import.meta.url)`
    const result = replacePlaceholders(code, cache)

    expect(result).toBeNull()
  })
})

describe('extractPlaceholderHashes', () => {
  it('should extract single hash', () => {
    const code = `new URL("__SW_ASSET__abc123__", import.meta.url)`
    const hashes = extractPlaceholderHashes(code)

    expect(hashes).toHaveLength(1)
    expect(hashes[0]).toBe('abc123')
  })

  it('should extract multiple hashes', () => {
    const code = `
      new URL("__SW_ASSET__abc123__", import.meta.url)
      new URL("__SW_ASSET__def456__", import.meta.url)
    `
    const hashes = extractPlaceholderHashes(code)

    expect(hashes).toHaveLength(2)
    expect(hashes).toContain('abc123')
    expect(hashes).toContain('def456')
  })

  it('should return empty array when no placeholders', () => {
    const code = `new URL("./sw.js", import.meta.url)`
    const hashes = extractPlaceholderHashes(code)

    expect(hashes).toHaveLength(0)
  })
})
