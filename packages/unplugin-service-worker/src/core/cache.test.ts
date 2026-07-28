import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createServiceWorkerCache } from './cache.ts'

import type { ServiceWorkerCache } from './cache.ts'

describe('createServiceWorkerCache', () => {
  let cache: ServiceWorkerCache

  beforeEach(() => {
    cache = createServiceWorkerCache()
  })

  describe('saveBundle', () => {
    it('should save bundle and return it', () => {
      const bundle = cache.saveBundle(
        '/path/to/sw.js',
        ['/path/to/sw.js', '/path/to/dep.js'],
        'assets/sw-abc123.js',
        'console.log("sw")',
        []
      )

      expect(bundle.entryFilename).toBe('assets/sw-abc123.js')
      expect(bundle.entryCode).toBe('console.log("sw")')
      expect(bundle.entryUrlPlaceholder).toMatch(/__SW_ASSET__[a-z\d]+__/)
      expect(bundle.watchedFiles).toEqual(['/path/to/sw.js', '/path/to/dep.js'])
    })

    it('should save assets along with bundle', () => {
      cache.saveBundle('/path/to/sw.js', [], 'assets/sw-abc123.js', 'console.log("sw")', [
        { fileName: 'assets/chunk1.js', source: 'chunk1 code' },
        { fileName: 'assets/chunk2.js', source: 'chunk2 code' }
      ])

      const assets = [...cache.getAllAssets()]
      expect(assets).toHaveLength(2)
      expect(assets.map(a => a.fileName)).toContain('assets/chunk1.js')
      expect(assets.map(a => a.fileName)).toContain('assets/chunk2.js')
    })
  })

  describe('getBundle', () => {
    it('should return saved bundle', () => {
      cache.saveBundle('/path/to/sw.js', [], 'assets/sw.js', 'code', [])

      const bundle = cache.getBundle('/path/to/sw.js')
      expect(bundle).toBeDefined()
      expect(bundle!.entryFilename).toBe('assets/sw.js')
    })

    it('should return undefined for non-existent bundle', () => {
      const bundle = cache.getBundle('/non/existent.js')
      expect(bundle).toBeUndefined()
    })
  })

  describe('getAllBundles', () => {
    it('should return all bundles', () => {
      cache.saveBundle('/sw1.js', [], 'assets/sw1.js', 'code1', [])
      cache.saveBundle('/sw2.js', [], 'assets/sw2.js', 'code2', [])

      const bundles = [...cache.getAllBundles()]
      expect(bundles).toHaveLength(2)
    })
  })

  describe('getFilenameFromHash', () => {
    it('should return filename from placeholder hash', () => {
      const bundle = cache.saveBundle('/sw.js', [], 'assets/sw-abc.js', 'code', [])

      // Extract hash from placeholder
      const match = bundle.entryUrlPlaceholder.match(/__SW_ASSET__([a-z\d]+)__/)
      expect(match).not.toBeNull()
      const hash = match![1]!

      const filename = cache.getFilenameFromHash(hash)
      expect(filename).toBe('assets/sw-abc.js')
    })

    it('should return undefined for unknown hash', () => {
      const filename = cache.getFilenameFromHash('unknown')
      expect(filename).toBeUndefined()
    })
  })

  describe('registerHashToFilename', () => {
    it('should register hash to filename mapping', () => {
      cache.registerHashToFilename('abc123', 'assets/sw-xyz.js')

      const filename = cache.getFilenameFromHash('abc123')
      expect(filename).toBe('assets/sw-xyz.js')
    })

    it('should overwrite existing mapping', () => {
      cache.registerHashToFilename('abc123', 'assets/old.js')
      cache.registerHashToFilename('abc123', 'assets/new.js')

      const filename = cache.getFilenameFromHash('abc123')
      expect(filename).toBe('assets/new.js')
    })
  })

  describe('invalidateAffectedBundles', () => {
    it('should mark bundle as invalidated when watched file changes', () => {
      cache.saveBundle('/sw.js', ['/sw.js', '/dep.js'], 'assets/sw.js', 'code', [])

      cache.invalidateAffectedBundles('/dep.js')

      // Bundle should still exist
      expect(cache.getBundle('/sw.js')).toBeDefined()
    })
  })

  describe('removeIfInvalidated', () => {
    it('should remove invalidated bundle and return true', () => {
      cache.saveBundle('/sw.js', ['/sw.js', '/dep.js'], 'assets/sw.js', 'code', [])
      cache.invalidateAffectedBundles('/dep.js')

      const removed = cache.removeIfInvalidated('/sw.js')

      expect(removed).toBe(true)
      expect(cache.getBundle('/sw.js')).toBeUndefined()
    })

    it('should return false if bundle was not invalidated', () => {
      cache.saveBundle('/sw.js', [], 'assets/sw.js', 'code', [])

      const removed = cache.removeIfInvalidated('/sw.js')

      expect(removed).toBe(false)
      expect(cache.getBundle('/sw.js')).toBeDefined()
    })
  })

  describe('clear', () => {
    it('should clear all caches', () => {
      cache.saveBundle('/sw1.js', [], 'assets/sw1.js', 'code1', [
        { fileName: 'assets/chunk.js', source: 'chunk' }
      ])
      cache.saveBundle('/sw2.js', [], 'assets/sw2.js', 'code2', [])

      cache.clear()

      expect([...cache.getAllBundles()]).toHaveLength(0)
      expect([...cache.getAllAssets()]).toHaveLength(0)
    })
  })

  describe('orphaned assets removal', () => {
    it('should remove orphaned assets when bundle is removed', () => {
      cache.saveBundle('/sw.js', ['/sw.js'], 'assets/sw.js', 'code', [
        { fileName: 'assets/orphan.js', source: 'orphan' }
      ])
      cache.invalidateAffectedBundles('/sw.js')
      cache.removeIfInvalidated('/sw.js')

      const assets = [...cache.getAllAssets()]
      expect(assets).toHaveLength(0)
    })

    it('should keep assets referenced by other bundles', () => {
      const sharedAsset = { fileName: 'assets/shared.js', source: 'shared' }

      cache.saveBundle('/sw1.js', ['/sw1.js'], 'assets/sw1.js', 'code1', [sharedAsset])
      cache.saveBundle('/sw2.js', ['/sw2.js'], 'assets/sw2.js', 'code2', [sharedAsset])

      cache.invalidateAffectedBundles('/sw1.js')
      cache.removeIfInvalidated('/sw1.js')

      const assets = [...cache.getAllAssets()]
      expect(assets.some(a => a.fileName === 'assets/shared.js')).toBe(true)
    })
  })
})
