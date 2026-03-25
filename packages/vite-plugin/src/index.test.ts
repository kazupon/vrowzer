import { describe, expect, test } from 'vitest'
import { Vrowzer } from './index.ts'

describe('Vrowzer', () => {
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
})
