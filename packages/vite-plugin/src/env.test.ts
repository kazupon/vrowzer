import { describe, expect, test } from 'vite-plus/test'
import {
  envPlugin,
  VROWZER_PREVIEW_BASE_PATH_DEFINE,
  VROWZER_SERVICE_WORKER_SCOPE_DEFINE
} from './env.ts'
import { resolveOptions } from './options.ts'

function createPlugin(options: Parameters<typeof resolveOptions>[0] = {}) {
  return envPlugin(resolveOptions(options))
}

describe('envPlugin', () => {
  test('plugin name is "vrowzer:env"', () => {
    const plugin = createPlugin()
    expect(plugin.name).toBe('vrowzer:env')
  })

  test('options hook sets transform.inject for process', () => {
    const plugin = createPlugin()
    const inputOptions: Record<string, any> = {}
    ;(plugin as any).options(inputOptions)

    expect(inputOptions.transform.inject.process).toBe('@vrowzer/node-polyfill/process')
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
    expect(inputOptions.transform.inject.process).toBe('@vrowzer/node-polyfill/process')
  })

  test('config hook sets resolve.alias for node polyfills', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.resolve.alias['node:fs']).toBe('@vrowzer/fs')
    expect(result.resolve.alias['node:path']).toBe('pathe')
    expect(result.resolve.alias['node:events']).toBe('@vrowzer/node-polyfill/events')
    expect(result.resolve.alias['node:url']).toBe('@vrowzer/node-polyfill/url')
    expect(result.resolve.alias['node:buffer']).toBe('buffer')
    expect(result.resolve.alias.fs).toBe('@vrowzer/fs')
    expect(result.resolve.alias.path).toBe('pathe')
  })

  test('config hook sets CORS headers for server', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.server.headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(result.server.headers['Cross-Origin-Embedder-Policy']).toBe('credentialless')
    expect(result.server.headers['Service-Worker-Allowed']).toBe('/')
  })

  test('config hook sets CORS headers for preview', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.preview.headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(result.preview.headers['Cross-Origin-Embedder-Policy']).toBe('credentialless')
    expect(result.preview.headers['Service-Worker-Allowed']).toBe('/')
  })

  test('config hook uses a custom service worker scope for server and preview', () => {
    const plugin = createPlugin({ serviceWorkerScope: '/app/' })
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.server.headers['Service-Worker-Allowed']).toBe('/app/')
    expect(result.preview.headers['Service-Worker-Allowed']).toBe('/app/')
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

  test('config hook defines the default preview base path', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.define[VROWZER_PREVIEW_BASE_PATH_DEFINE]).toBe(JSON.stringify('/__preview__/'))
  })

  test('config hook defines a custom preview base path', () => {
    const plugin = envPlugin(resolveOptions({ basePath: '/app/__preview__/' }))
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.define[VROWZER_PREVIEW_BASE_PATH_DEFINE]).toBe(
      JSON.stringify('/app/__preview__/')
    )
  })

  test('config hook defines the default service worker scope', () => {
    const plugin = createPlugin()
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.define[VROWZER_SERVICE_WORKER_SCOPE_DEFINE]).toBe(JSON.stringify('/'))
  })

  test('config hook defines a custom service worker scope', () => {
    const plugin = createPlugin({ serviceWorkerScope: '/app/' })
    const result = (plugin as any).config({}, { command: 'serve' })

    expect(result.define[VROWZER_SERVICE_WORKER_SCOPE_DEFINE]).toBe(JSON.stringify('/app/'))
  })

  test('configResolved accepts the injected preview base path', () => {
    const plugin = createPlugin()
    const define = {
      [VROWZER_PREVIEW_BASE_PATH_DEFINE]: JSON.stringify('/__preview__/'),
      [VROWZER_SERVICE_WORKER_SCOPE_DEFINE]: JSON.stringify('/')
    }

    expect(() => (plugin as any).configResolved({ define })).not.toThrow()
  })

  test('configResolved rejects an overridden preview base path', () => {
    const plugin = createPlugin()
    const define = {
      [VROWZER_PREVIEW_BASE_PATH_DEFINE]: JSON.stringify('/other/'),
      [VROWZER_SERVICE_WORKER_SCOPE_DEFINE]: JSON.stringify('/')
    }

    expect(() => (plugin as any).configResolved({ define })).toThrow(
      `Vrowzer reserved define ${VROWZER_PREVIEW_BASE_PATH_DEFINE}`
    )
  })

  test('configResolved rejects an overridden service worker scope', () => {
    const plugin = createPlugin()
    const define = {
      [VROWZER_PREVIEW_BASE_PATH_DEFINE]: JSON.stringify('/__preview__/'),
      [VROWZER_SERVICE_WORKER_SCOPE_DEFINE]: JSON.stringify('/other/')
    }

    expect(() => (plugin as any).configResolved({ define })).toThrow(
      `Vrowzer reserved define ${VROWZER_SERVICE_WORKER_SCOPE_DEFINE}`
    )
  })

  test('configResolved rejects a missing service worker scope', () => {
    const plugin = createPlugin()
    const define = {
      [VROWZER_PREVIEW_BASE_PATH_DEFINE]: JSON.stringify('/__preview__/')
    }

    expect(() => (plugin as any).configResolved({ define })).toThrow(
      `Vrowzer reserved define ${VROWZER_SERVICE_WORKER_SCOPE_DEFINE}`
    )
  })
})
