import { vol } from 'memfs'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import promises, { constants, mkdir, readFile, stat, writeFile } from './promises.ts'

describe('@vrowzer/fs promises entry', () => {
  beforeEach(() => {
    vol.reset()
  })

  describe('exports', () => {
    it('exports promises methods', () => {
      expect(readFile).toBeDefined()
      expect(writeFile).toBeDefined()
      expect(mkdir).toBeDefined()
      expect(stat).toBeDefined()
    })

    it('exports constants', () => {
      expect(constants).toBeDefined()
    })
  })

  describe('default export', () => {
    it('is promises object', () => {
      expect(promises.readFile).toBeDefined()
      expect(promises.writeFile).toBeDefined()
    })
  })

  describe('functional tests', () => {
    it('can writeFile and readFile', async () => {
      await writeFile('/test.txt', 'hello async')
      const content = await readFile('/test.txt', 'utf8')
      expect(content).toBe('hello async')
    })

    it('can mkdir and stat', async () => {
      await mkdir('/mydir')
      const stats = await stat('/mydir')
      expect(stats.isDirectory()).toBe(true)
    })
  })

  describe('uses same fs instance as main entry', () => {
    it('shares filesystem with main entry', async () => {
      const { writeFileSync } = await import('./index.ts')
      writeFileSync('/shared.txt', 'from sync')
      const content = await readFile('/shared.txt', 'utf8')
      expect(content).toBe('from sync')
    })
  })
})
