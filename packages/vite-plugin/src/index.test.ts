import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type ServiceWorkerPluginFactory = (options: unknown) => { name: string }

const serviceWorkerPluginFactory = vi.hoisted(() =>
  vi.fn<ServiceWorkerPluginFactory>(_options => ({ name: 'unplugin-service-worker' }))
)

vi.mock('@vrowzer/unplugin-service-worker/vite', () => ({
  default: serviceWorkerPluginFactory
}))

import { Vrowzer } from './index.ts'

describe('Vrowzer', () => {
  beforeEach(() => {
    serviceWorkerPluginFactory.mockClear()
  })

  test('returns array of 7 plugins with auto mode (default)', () => {
    const plugins = Vrowzer()
    expect(plugins).toHaveLength(7)
  })

  test('returns array of 6 plugins with auto: false', () => {
    const plugins = Vrowzer({ auto: false })
    expect(plugins).toHaveLength(6)
  })

  test('includes vrowzer:auto-manifest plugin when auto: true', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:auto-manifest')).toBe(true)
  })

  test('excludes vrowzer:auto-manifest plugin when auto: false', () => {
    const plugins = Vrowzer({ auto: false })
    expect(plugins.some((p: any) => p.name === 'vrowzer:auto-manifest')).toBe(false)
  })

  test('includes vrowzer:config plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:config')).toBe(true)
  })

  test('includes vrowzer:server-middleware plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:server-middleware')).toBe(true)
  })

  test('includes vrowzer:env plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:env')).toBe(true)
  })

  test('includes vrowzer:rolldown plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:rolldown')).toBe(true)
  })

  test('includes service-worker plugin', () => {
    const plugins = Vrowzer()
    // unplugin-service-worker generates a plugin with 'unplugin-service-worker' in the name
    expect(plugins.some((p: any) => p.name?.includes('service-worker'))).toBe(true)
  })

  test('uses the default scope for the service-worker response header', () => {
    Vrowzer()

    expect(serviceWorkerPluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: expect.any(String),
        serviceWorkerAllowed: '/',
        format: 'esm'
      })
    )
  })

  test('uses a custom scope for the service-worker response header', () => {
    Vrowzer({ serviceWorkerScope: '/app/' })

    expect(serviceWorkerPluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({ serviceWorkerAllowed: '/app/' })
    )
  })

  test('forwards a custom service worker entry', () => {
    Vrowzer({ serviceWorkerEntry: '/custom/service-worker.ts' })

    expect(serviceWorkerPluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({ entry: '/custom/service-worker.ts', format: 'esm' })
    )
  })
})
