import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PackageCache } from './packages'
import { findNearestMainPackageData, findNearestPackageData } from './packages'
import { normalizePath } from './utils'

let root: string

function writeManifest(directory: string, data: Record<string, unknown>): string {
  const target = path.join(root, directory)
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(data))
  return target
}

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vrowzer-packages-')))
  writeManifest('', { name: 'project' })
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(root, { recursive: true, force: true })
})

describe('findNearestMainPackageData', () => {
  it.each([
    ['node_modules/dep', 'dep'],
    ['node_modules/.pnpm/dep@1.0.0/node_modules/dep', 'dep'],
    ['node_modules/.pnpm/node_modules/dep', 'dep'],
    ['node_modules/@scope/dep', '@scope/dep'],
    ['node_modules/.pnpm/@scope+dep@1.0.0/node_modules/@scope/dep', '@scope/dep'],
    ['cache/dep-npm-1.0.0-hash.zip/node_modules/dep', 'dep'],
  ])('finds the package root at %s', (directory, name) => {
    const packageDir = writeManifest(directory, { name, version: '1.0.0' })
    const nestedDir = writeManifest(`${directory}/dist/esm`, { name, type: 'module' })

    const pkg = findNearestMainPackageData(nestedDir)

    expect(pkg?.dir).toBe(normalizePath(packageDir))
    expect(pkg?.data).toMatchObject({ name, version: '1.0.0' })
  })

  it('does not treat a scope directory as a package root', () => {
    writeManifest('node_modules/@scope', { name: 'scope-directory' })
    const nestedDir = writeManifest('node_modules/@scope/dep/dist', { name: 'internal' })

    expect(findNearestMainPackageData(nestedDir)?.data.name).toBe('project')
  })

  it('preserves the nearest named manifest outside node_modules', () => {
    writeManifest('packages/feature', { name: 'feature', version: '1.0.0' })
    const nestedDir = writeManifest('packages/feature/src', {
      name: 'feature-source',
      type: 'module',
    })

    expect(findNearestMainPackageData(nestedDir)?.data.name).toBe('feature-source')
  })

  it('skips an unnamed type marker in a workspace package', () => {
    const packageDir = writeManifest('packages/feature', { name: 'feature', version: '1.0.0' })
    const nestedDir = writeManifest('packages/feature/src', { type: 'module' })

    expect(findNearestMainPackageData(nestedDir)?.dir).toBe(normalizePath(packageDir))
  })

  it('returns null when no named manifest is found', () => {
    writeManifest('', { type: 'module' })

    expect(findNearestMainPackageData(root)).toBeNull()
  })

  it('reuses the cache without replacing the nearest type marker', () => {
    const packageDir = writeManifest('node_modules/dep', { name: 'dep', version: '1.0.0' })
    const nestedDir = writeManifest('node_modules/dep/dist/esm', { name: 'dep', type: 'module' })
    const cache: PackageCache = new Map()
    const nearest = findNearestPackageData(nestedDir, cache)
    const main = findNearestMainPackageData(nestedDir, cache)

    expect(nearest?.dir).toBe(normalizePath(nestedDir))
    expect(main?.dir).toBe(normalizePath(packageDir))
    const readFile = vi.spyOn(fs, 'readFileSync')

    expect(findNearestMainPackageData(nestedDir, cache)).toBe(main)
    expect(findNearestPackageData(nestedDir, cache)).toBe(nearest)
    expect(readFile).not.toHaveBeenCalled()
  })
})
