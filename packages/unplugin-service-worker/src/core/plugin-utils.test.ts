import { describe, expect, it } from 'vite-plus/test'
import { filterServiceWorkerPlugins, resolveServiceWorkerPlugins } from '../index.ts'

import type { Plugin } from 'rolldown'

describe('filterServiceWorkerPlugins', () => {
  it('should return undefined for undefined input', () => {
    expect(filterServiceWorkerPlugins(undefined)).toBeUndefined()
  })

  it('should return undefined for empty array', () => {
    expect(filterServiceWorkerPlugins([])).toBeUndefined()
  })

  it('should allow vite:asset (needed for ?raw support)', () => {
    const plugins = [{ name: 'vite:asset' }, { name: 'vite:import-analysis' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('vite:asset')
  })

  it('should allow vite:define', () => {
    const plugins = [{ name: 'vite:define' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('vite:define')
  })

  it('should allow vite:json and native:json', () => {
    const plugins = [{ name: 'vite:json' }, { name: 'native:json' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(2)
  })

  it('should allow vite:wasm-helper and wasm-fallback variants', () => {
    const plugins = [
      { name: 'vite:wasm-helper' },
      { name: 'vite:wasm-fallback' },
      { name: 'native:wasm-fallback' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(3)
  })

  it('should filter out Vite internal plugins not in allowlist', () => {
    const plugins = [
      { name: 'vite:build-html' },
      { name: 'vite:css' },
      { name: 'vite:css-post' },
      { name: 'vite:manifest' },
      { name: 'vite:ssr-manifest' },
      { name: 'vite:reporter' },
      { name: 'vite:load-fallback' },
      { name: 'vite:import-analysis' },
      { name: 'vite:build-import-analysis' },
      { name: 'vite:client-inject' },
      { name: 'vite:worker' },
      { name: 'vite:resolve' },
      { name: 'vite:asset' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('vite:asset')
  })

  it('should filter out unplugin-service-worker (prevent recursion)', () => {
    const plugins = [{ name: 'unplugin-service-worker' }, { name: 'my-plugin' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('my-plugin')
  })

  it('should keep plugins without a name', () => {
    const plugins = [{ resolveId: () => null }, { name: 'vite:build-html' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
  })

  it('should filter out null and non-object entries', () => {
    const plugins = [null, undefined, 'string-plugin', 42, { name: 'valid-plugin' }]

    const result = filterServiceWorkerPlugins(plugins as unknown[])!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('valid-plugin')
  })

  it('should keep user plugins and third-party plugins', () => {
    const plugins = [
      { name: 'my-custom-plugin' },
      { name: '@some/plugin' },
      { name: 'rolldown-plugin-foo' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(3)
  })

  it('should filter out native: prefixed plugins not in allowlist', () => {
    const plugins = [
      { name: 'native:alias' },
      { name: 'native:json' },
      { name: 'native:wasm-fallback' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(2)
    expect(result.map(p => p.name)).toContain('native:json')
    expect(result.map(p => p.name)).toContain('native:wasm-fallback')
  })
})

describe('resolveServiceWorkerPlugins', () => {
  const pluginA: Plugin = { name: 'plugin-a' }
  const pluginB: Plugin = { name: 'plugin-b' }
  const pluginC: Plugin = { name: 'plugin-c' }

  it('should return empty array when both inputs are undefined', () => {
    const result = resolveServiceWorkerPlugins(undefined, undefined)
    expect(result).toEqual([])
  })

  it('should return user plugins when bundler plugins are undefined', () => {
    const result = resolveServiceWorkerPlugins([pluginA, pluginB], undefined)
    expect(result).toEqual([pluginA, pluginB])
  })

  it('should return bundler plugins when user plugins are undefined', () => {
    const result = resolveServiceWorkerPlugins(undefined, [pluginB, pluginC])
    expect(result).toEqual([pluginB, pluginC])
  })

  it('should merge user plugins before bundler plugins', () => {
    const result = resolveServiceWorkerPlugins([pluginA], [pluginB, pluginC])
    expect(result).toEqual([pluginA, pluginB, pluginC])
  })

  it('should place user plugins first (higher priority)', () => {
    const userPlugin: Plugin = { name: 'user-override' }
    const bundlerPlugin: Plugin = { name: 'bundler-default' }

    const result = resolveServiceWorkerPlugins([userPlugin], [bundlerPlugin])
    expect(result[0]).toBe(userPlugin)
    expect(result[1]).toBe(bundlerPlugin)
  })
})
