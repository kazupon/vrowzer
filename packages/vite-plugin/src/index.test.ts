import { describe, expect, test } from 'vitest'
import { Vrowser } from './index.ts'

describe('Vrowser', () => {
  test('returns array of 6 plugins', () => {
    const plugins = Vrowser()
    expect(plugins).toHaveLength(6)
  })

  test('includes vrowser:config plugin', () => {
    const plugins = Vrowser()
    expect(plugins.some((p: any) => p.name === 'vrowser:config')).toBe(true)
  })

  test('includes vrowser:server-middleware plugin', () => {
    const plugins = Vrowser()
    expect(plugins.some((p: any) => p.name === 'vrowser:server-middleware')).toBe(true)
  })

  test('includes vrowser:core plugin', () => {
    const plugins = Vrowser()
    expect(plugins.some((p: any) => p.name === 'vrowser:core')).toBe(true)
  })

  test('includes vrowser:rolldown plugin', () => {
    const plugins = Vrowser()
    expect(plugins.some((p: any) => p.name === 'vrowser:rolldown')).toBe(true)
  })

  test('includes service-worker plugin', () => {
    const plugins = Vrowser()
    // unplugin-service-worker generates a plugin with 'unplugin-service-worker' in the name
    expect(plugins.some((p: any) => p.name?.includes('service-worker'))).toBe(true)
  })
})
