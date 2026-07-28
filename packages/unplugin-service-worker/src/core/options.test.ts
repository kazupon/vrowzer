import { describe, expect, it } from 'vite-plus/test'
import { resolveOptions } from './options.ts'

import type { Plugin } from 'rolldown'

describe('resolveOptions', () => {
  it('should set default values when no options provided', () => {
    const resolved = resolveOptions({})

    expect(resolved.include).toEqual([/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/])
    expect(resolved.exclude).toEqual([/node_modules/])
    expect(resolved.enforce).toBe('pre')
    expect(resolved.serviceWorkerAllowed).toBeUndefined()
    expect(resolved.plugins).toBeUndefined()
  })

  it('should pass through plugins option', () => {
    const plugin: Plugin = { name: 'test-plugin' }
    const resolved = resolveOptions({ plugins: [plugin] })

    expect(resolved.plugins).toEqual([plugin])

    expect(resolved.plugins![0]).toBe(plugin)
  })

  it('should leave plugins undefined when not specified', () => {
    const resolved = resolveOptions({
      include: [/\.ts$/],
      enforce: 'post'
    })

    expect(resolved.plugins).toBeUndefined()
  })

  it('should pass through empty plugins array', () => {
    const resolved = resolveOptions({ plugins: [] })

    expect(resolved.plugins).toEqual([])
  })

  it('should pass through multiple plugins', () => {
    const pluginA: Plugin = { name: 'plugin-a' }
    const pluginB: Plugin = { name: 'plugin-b' }
    const resolved = resolveOptions({ plugins: [pluginA, pluginB] })

    expect(resolved.plugins).toHaveLength(2)
    expect(resolved.plugins![0]).toBe(pluginA)
    expect(resolved.plugins![1]).toBe(pluginB)
  })

  it('should pass through assets option', () => {
    const resolved = resolveOptions({
      assets: [{ src: 'path/to/file.wasm' }]
    })
    expect(resolved.assets).toEqual([{ src: 'path/to/file.wasm' }])
  })

  it('should pass through assets with fileName', () => {
    const resolved = resolveOptions({
      assets: [{ src: 'path/to/file.wasm', fileName: 'custom.wasm' }]
    })
    expect(resolved.assets).toEqual([{ src: 'path/to/file.wasm', fileName: 'custom.wasm' }])
  })

  it('should leave assets undefined when not specified', () => {
    const resolved = resolveOptions({})
    expect(resolved.assets).toBeUndefined()
  })
})
