/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { SW_ASSET_PREFIX, SW_ASSET_SUFFIX } from './constants.ts'

/**
 * Bundled Service Worker information
 */
export interface ServiceWorkerBundle {
  /** Output filename (e.g., "assets/sw-abc123.js") */
  entryFilename: string
  /** Bundled code content */
  entryCode: string
  /** Placeholder for URL replacement (e.g., "__SW_ASSET__abc123__") */
  entryUrlPlaceholder: string
  /** Set of referenced asset filenames */
  referencedAssets: Set<string>
  /** List of watched file paths */
  watchedFiles: string[]
}

/**
 * Asset emitted during Service Worker bundling
 */
export interface ServiceWorkerAsset {
  fileName: string
  source: string | Uint8Array
}

/**
 * Service Worker cache interface
 */
export interface ServiceWorkerCache {
  /** Save a bundled Service Worker */
  saveBundle(
    inputId: string,
    watchedFiles: string[],
    entryFilename: string,
    entryCode: string,
    assets: ServiceWorkerAsset[]
  ): ServiceWorkerBundle
  /** Get cached bundle for input ID */
  getBundle(inputId: string): ServiceWorkerBundle | undefined
  /** Get all cached bundles */
  getAllBundles(): IterableIterator<ServiceWorkerBundle>
  /** Get all cached assets */
  getAllAssets(): IterableIterator<ServiceWorkerAsset>
  /** Get entry filename from placeholder hash */
  getFilenameFromHash(hash: string): string | undefined
  /** Register hash to filename mapping (for Webpack/Rspack child compiler) */
  registerHashToFilename(hash: string, filename: string): void
  /** Mark bundles as invalidated when a watched file changes */
  invalidateAffectedBundles(filePath: string): void
  /** Remove bundle if it was invalidated */
  removeIfInvalidated(inputId: string): boolean
  /** Clear all caches */
  clear(): void
}

/**
 * Generate a simple hash from string
 */
function getHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}

/**
 * Create a Service Worker cache instance
 * Prevents duplicate bundling of the same Service Worker file
 */
export function createServiceWorkerCache(): ServiceWorkerCache {
  // Private state
  const _bundles = new Map<string, ServiceWorkerBundle>()
  const _assets = new Map<string, ServiceWorkerAsset>()
  const _hashToFilename = new Map<string, string>()
  const _invalidatedBundles = new Set<string>()

  // Private functions
  function removeBundle(inputId: string): void {
    const bundle = _bundles.get(inputId)
    if (!bundle) {
      return
    }

    _bundles.delete(inputId)
    _hashToFilename.delete(getHash(bundle.entryFilename))
    _assets.delete(bundle.entryFilename)

    // Remove orphaned assets (not referenced by any other bundle)
    const remainingBundles = [..._bundles.values()]
    for (const assetFileName of bundle.referencedAssets) {
      const isReferenced = remainingBundles.some(b => b.referencedAssets.has(assetFileName))
      if (!isReferenced) {
        _assets.delete(assetFileName)
      }
    }
  }

  // Public interface
  function saveBundle(
    inputId: string,
    watchedFiles: string[],
    entryFilename: string,
    entryCode: string,
    assets: ServiceWorkerAsset[]
  ): ServiceWorkerBundle {
    // Save assets
    for (const asset of assets) {
      _assets.set(asset.fileName, asset)
    }

    // Generate placeholder
    const hash = getHash(entryFilename)
    const entryUrlPlaceholder = `${SW_ASSET_PREFIX}${hash}${SW_ASSET_SUFFIX}`

    // Map hash to filename
    if (!_hashToFilename.has(hash)) {
      _hashToFilename.set(hash, entryFilename)
    }

    const bundle: ServiceWorkerBundle = {
      entryFilename,
      entryCode,
      entryUrlPlaceholder,
      referencedAssets: new Set(assets.map(a => a.fileName)),
      watchedFiles
    }

    _bundles.set(inputId, bundle)
    return bundle
  }

  function getBundle(inputId: string): ServiceWorkerBundle | undefined {
    return _bundles.get(inputId)
  }

  function getAllBundles(): IterableIterator<ServiceWorkerBundle> {
    return _bundles.values()
  }

  function getAllAssets(): IterableIterator<ServiceWorkerAsset> {
    return _assets.values()
  }

  function getFilenameFromHash(hash: string): string | undefined {
    return _hashToFilename.get(hash)
  }

  function registerHashToFilename(hash: string, filename: string): void {
    _hashToFilename.set(hash, filename)
  }

  function invalidateAffectedBundles(filePath: string): void {
    for (const [inputId, bundle] of _bundles.entries()) {
      if (bundle.watchedFiles.includes(filePath)) {
        _invalidatedBundles.add(inputId)
      }
    }
  }

  function removeIfInvalidated(inputId: string): boolean {
    if (_invalidatedBundles.has(inputId)) {
      _invalidatedBundles.delete(inputId)
      removeBundle(inputId)
      return true
    }
    return false
  }

  function clear(): void {
    _bundles.clear()
    _assets.clear()
    _hashToFilename.clear()
    _invalidatedBundles.clear()
  }

  return {
    saveBundle,
    getBundle,
    getAllBundles,
    getAllAssets,
    getFilenameFromHash,
    registerHashToFilename,
    invalidateAffectedBundles,
    removeIfInvalidated,
    clear
  }
}
