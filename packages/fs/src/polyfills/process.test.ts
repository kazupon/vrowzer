import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chdir, cwd, process, resetCwd, setCwd } from './process.ts'

describe('process polyfill', () => {
  beforeEach(() => {
    resetCwd()
  })

  describe('cwd()', () => {
    it('returns "/" by default', () => {
      expect(cwd()).toBe('/')
    })

    it('returns the current working directory after chdir', () => {
      chdir('/src')
      expect(cwd()).toBe('/src')
    })
  })

  describe('chdir(directory)', () => {
    it('changes cwd with absolute path', () => {
      chdir('/src/components')
      expect(cwd()).toBe('/src/components')
    })

    it('changes cwd with relative path', () => {
      chdir('/src')
      chdir('components')
      expect(cwd()).toBe('/src/components')
    })

    it('resolves ".." in relative paths', () => {
      chdir('/src/components')
      chdir('..')
      expect(cwd()).toBe('/src')
    })

    it('removes trailing slash except for root', () => {
      chdir('/src/')
      expect(cwd()).toBe('/src')
    })
  })

  describe('resetCwd()', () => {
    it('resets cwd to "/"', () => {
      chdir('/src/deep/path')
      resetCwd()
      expect(cwd()).toBe('/')
    })
  })

  describe('setCwd(directory)', () => {
    it('sets cwd directly without path resolution', () => {
      setCwd('/custom/path')
      expect(cwd()).toBe('/custom/path')
    })
  })

  describe('process object', () => {
    it('has platform property', () => {
      expect(typeof process.platform).toBe('string')
    })

    it('has env object', () => {
      expect(typeof process.env).toBe('object')
    })

    it('has cwd and chdir functions', () => {
      expect(typeof process.cwd).toBe('function')
      expect(typeof process.chdir).toBe('function')
    })

    it('process.cwd returns virtual cwd', () => {
      resetCwd()
      expect(process.cwd()).toBe('/')
      process.chdir('/test')
      expect(process.cwd()).toBe('/test')
    })

    it('has nextTick function', () => {
      expect(typeof process.nextTick).toBe('function')
    })

    it('nextTick schedules callback', async () => {
      const fn = vi.fn()
      process.nextTick(fn)
      await new Promise(r => setTimeout(r, 0))
      expect(fn).toHaveBeenCalled()
    })

    it('has getuid and getgid functions', () => {
      expect(typeof process.getuid).toBe('function')
      expect(typeof process.getgid).toBe('function')
    })

    it('has hrtime function', () => {
      const result = process.hrtime()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(typeof result[0]).toBe('number')
      expect(typeof result[1]).toBe('number')
    })
  })
})
