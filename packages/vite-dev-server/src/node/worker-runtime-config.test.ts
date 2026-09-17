import { describe, expect, test } from 'vite-plus/test'
import { assertWorkerRuntimeConfig, mergeWorkerRuntimeConfig, snapshotWorkerRuntimeConfig } from './worker-runtime-config'

const runtime = {
  root: '/',
  base: '/custom-preview/',
  publicDir: 'public',
  optimizeDeps: { disabled: true },
  experimental: {
    importGlobRestoreExtension: false,
    hmrPartialAccept: false,
    bundledDev: false,
  },
}

describe('standard Worker runtime config', () => {
  test('preserves non-reserved fields without losing runtime defaults', () => {
    const renderBuiltUrl = () => undefined
    const user = {
      define: { __PREVIEW__: 'true' },
      resolve: { dedupe: ['svelte'] },
      server: { forwardConsole: false },
      optimizeDeps: { exclude: ['local'] },
      experimental: { renderBuiltUrl },
    }
    const config = mergeWorkerRuntimeConfig(runtime, user, snapshotWorkerRuntimeConfig(runtime))
    expect(config).toEqual({
      ...runtime, ...user,
      optimizeDeps: { disabled: true, exclude: ['local'] },
      experimental: { ...runtime.experimental, renderBuiltUrl },
    })
    expect(user.optimizeDeps).toEqual({ exclude: ['local'] })
    expect(config.define).toBe(user.define)
  })

  test.each([
    {},
    { root: '/', base: '/custom-preview/', publicDir: 'public' },
    { root: '/.', base: '/custom-preview', publicDir: '/public' },
    { optimizeDeps: { disabled: undefined }, experimental: { bundledDev: undefined } },
  ])('accepts omitted or equivalent settings: %j', user => {
    expect(mergeWorkerRuntimeConfig(runtime, user, snapshotWorkerRuntimeConfig(runtime))).toEqual(runtime)
  })

  test('keeps the removed native plugin option as a non-reserved setting', () => {
    const user = { experimental: { enableNativePlugin: false } }
    const policy = snapshotWorkerRuntimeConfig(runtime)
    const config = mergeWorkerRuntimeConfig(runtime, user, policy)
    expect(config.experimental).toEqual({ ...runtime.experimental, enableNativePlugin: false })
    expect(policy.experimental).not.toHaveProperty('enableNativePlugin')
    expect(() => assertWorkerRuntimeConfig(config, policy, true)).not.toThrow()
  })

  test.each([
    ['root', { root: '/host' }],
    ['base', { base: '/another/' }],
    ['publicDir', { publicDir: false }],
    ['publicDir', { publicDir: '' }],
    ['publicDir', { publicDir: '../assets' }],
    ['optimizeDeps.disabled', { optimizeDeps: { disabled: false } }],
    ['experimental.importGlobRestoreExtension', { experimental: { importGlobRestoreExtension: true } }],
    ['experimental.hmrPartialAccept', { experimental: { hmrPartialAccept: true } }],
    ['experimental.bundledDev', { experimental: { bundledDev: true } }],
  ])('rejects changing %s', (key, user) => {
    expect(() => mergeWorkerRuntimeConfig(runtime, user as Record<string, unknown>, snapshotWorkerRuntimeConfig(runtime)))
      .toThrow(`cannot change runtime-owned ${key}`)
  })

  test.each([null, false, [], 'invalid'])('rejects malformed reserved blocks: %j', value => {
    expect(() => mergeWorkerRuntimeConfig(runtime, { experimental: value }, snapshotWorkerRuntimeConfig(runtime)))
      .toThrow('experimental must be an object')
  })

  test('checks normalized resolved settings and detects hook removal of fixed values', () => {
    const policy = snapshotWorkerRuntimeConfig(runtime)
    const config = { ...runtime, publicDir: '/public' }
    expect(() => assertWorkerRuntimeConfig(config, policy, true)).not.toThrow()
    expect(() => assertWorkerRuntimeConfig({ ...config, experimental: {} }, policy, true))
      .toThrow('experimental.importGlobRestoreExtension')
  })

  test.each([undefined, true, false, 'dev', 'build'])(
    'allows framework hooks to normalize the deprecated optimizer flag to %s', disabled => {
      expect(() => assertWorkerRuntimeConfig(
        { ...runtime, publicDir: '/public', optimizeDeps: { disabled } },
        snapshotWorkerRuntimeConfig(runtime),
        true,
      )).not.toThrow()
    },
  )

  test('does not share mutable reserved blocks with the config sent to plugins', () => {
    const policy = snapshotWorkerRuntimeConfig(runtime)
    const merged = mergeWorkerRuntimeConfig(runtime, {}, policy)
    const experimental = merged.experimental as Record<string, unknown>
    experimental.bundledDev = true
    expect(policy.experimental.bundledDev).toBe(false)
    expect(runtime.experimental.bundledDev).toBe(false)
    expect(() => assertWorkerRuntimeConfig(merged, policy, true)).toThrow('experimental.bundledDev')
  })
})
