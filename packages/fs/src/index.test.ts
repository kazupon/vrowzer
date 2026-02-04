import { beforeEach, describe, expect, it } from 'vitest'
import {
  chdir,
  createFsFromVolume,
  cwd,
  existsSync,
  fs,
  memfs,
  mkdirSync,
  promises,
  readFileSync,
  resetCwd,
  vol,
  Volume,
  writeFileSync
} from './index.ts'

describe('@vrowser/fs main entry', () => {
  beforeEach(() => {
    vol.reset()
    resetCwd()
  })

  describe('memfs re-exports', () => {
    it('exports vol', () => {
      expect(vol).toBeDefined()
    })

    it('exports fs', () => {
      expect(fs).toBeDefined()
    })

    it('exports Volume', () => {
      expect(Volume).toBeDefined()
    })

    it('exports createFsFromVolume', () => {
      expect(createFsFromVolume).toBeDefined()
    })

    it('exports memfs', () => {
      expect(memfs).toBeDefined()
    })
  })

  describe('file operations', () => {
    it('can write and read files', () => {
      writeFileSync('/test.txt', 'hello')
      expect(readFileSync('/test.txt', 'utf8')).toBe('hello')
    })

    it('existsSync works', () => {
      expect(existsSync('/test.txt')).toBe(false)
      writeFileSync('/test.txt', 'content')
      expect(existsSync('/test.txt')).toBe(true)
    })

    it('mkdirSync creates directories', () => {
      mkdirSync('/mydir')
      expect(existsSync('/mydir')).toBe(true)
    })
  })

  describe('promises API', () => {
    it('exports promises', () => {
      expect(promises).toBeDefined()
      expect(promises.readFile).toBeDefined()
    })
  })

  describe('process integration', () => {
    it('exports cwd and chdir', () => {
      expect(cwd()).toBe('/')
      chdir('/src')
      expect(cwd()).toBe('/src')
    })
  })
})
