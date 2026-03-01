import { describe, expect, test } from 'vitest'
import { corePlugin } from './core.ts'
import { resolveOptions } from './options.ts'

function createPlugin() {
  return corePlugin(resolveOptions({}))
}

describe('corePlugin', () => {
  test('plugin name is "vrowser:core"', () => {
    const plugin = createPlugin()
    expect(plugin.name).toBe('vrowser:core')
  })

  test('options hook sets transform.inject for process', () => {
    const plugin = createPlugin()
    const inputOptions: Record<string, any> = {}
    ;(plugin as any).options(inputOptions)

    expect(inputOptions.transform.inject.process).toBe('@vrowser/node-polyfill/process')
  })

  test('options hook merges with existing inject', () => {
    const plugin = createPlugin()
    const inputOptions: Record<string, any> = {
      transform: {
        inject: { Buffer: 'buffer' }
      }
    }
    ;(plugin as any).options(inputOptions)

    expect(inputOptions.transform.inject.Buffer).toBe('buffer')
    expect(inputOptions.transform.inject.process).toBe('@vrowser/node-polyfill/process')
  })

  test('config hook sets resolve.alias for node polyfills', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.resolve.alias['node:fs']).toBe('@vrowser/fs')
    expect(result.resolve.alias['node:path']).toBe('pathe')
    expect(result.resolve.alias['node:events']).toBe('@vrowser/node-polyfill/events')
    expect(result.resolve.alias['node:url']).toBe('@vrowser/node-polyfill/url')
    expect(result.resolve.alias['node:buffer']).toBe('buffer')
    expect(result.resolve.alias.fs).toBe('@vrowser/fs')
    expect(result.resolve.alias.path).toBe('pathe')
  })

  test('config hook sets CORS headers for server', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.server.headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(result.server.headers['Cross-Origin-Embedder-Policy']).toBe('credentialless')
  })

  test('config hook sets CORS headers for preview', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.preview.headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(result.preview.headers['Cross-Origin-Embedder-Policy']).toBe('credentialless')
    expect(result.preview.headers['Service-Worker-Allowed']).toBe('/')
  })

  test('config hook sets worker format to "es"', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.worker.format).toBe('es')
  })

  test('config hook sets import.meta.env.DEBUG define', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.define['import.meta.env.DEBUG']).toBeDefined()
  })
})
