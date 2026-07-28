import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { createViteQueryPlugin } from '../index.ts'

describe('createViteQueryPlugin', () => {
  it('should return a plugin with correct name', () => {
    const plugin = createViteQueryPlugin()
    expect(plugin.name).toBe('unplugin-service-worker:vite-query')
  })

  it('should have resolveId and load hooks', () => {
    const plugin = createViteQueryPlugin()
    expect(plugin.resolveId).toBeDefined()
    expect(plugin.load).toBeDefined()
  })

  describe('resolveId filter', () => {
    it('should have a filter matching ?raw query', () => {
      const plugin = createViteQueryPlugin()
      const resolveId = plugin.resolveId as { filter: { id: RegExp } }
      expect(resolveId.filter.id.test('foo?raw')).toBe(true)
      expect(resolveId.filter.id.test('foo?url')).toBe(true)
      expect(resolveId.filter.id.test('foo?inline')).toBe(true)
      expect(resolveId.filter.id.test('foo?bar')).toBe(false)
      expect(resolveId.filter.id.test('foo')).toBe(false)
    })
  })

  describe('load filter', () => {
    it('should have a filter matching ?raw query', () => {
      const plugin = createViteQueryPlugin()
      const load = plugin.load as { filter: { id: RegExp } }
      expect(load.filter.id.test('/path/to/file.ts?raw')).toBe(true)
      expect(load.filter.id.test('/path/to/file.ts?url')).toBe(false)
      expect(load.filter.id.test('/path/to/file.ts')).toBe(false)
    })
  })

  describe('load handler', () => {
    it('should read file and return as string export for ?raw', async () => {
      const plugin = createViteQueryPlugin()
      const load = plugin.load as { handler: (id: string) => Promise<{ code: string } | null> }

      // Use this test file itself as a known file
      const testFile = path.resolve(__dirname, 'vite-query.test.ts')
      const result = await load.handler.call({}, testFile + '?raw')

      expect(result).not.toBeNull()
      expect(result!.code).toMatch(/^export default "/)
      expect(result!.code).toContain('createViteQueryPlugin')
    })

    it('should return null for non-existent file', async () => {
      const plugin = createViteQueryPlugin()
      const load = plugin.load as { handler: (id: string) => Promise<{ code: string } | null> }

      const result = await load.handler.call({}, '/non/existent/file.ts?raw')
      expect(result).toBeNull()
    })
  })
})
