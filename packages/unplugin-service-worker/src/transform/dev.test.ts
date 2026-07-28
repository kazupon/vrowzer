import { describe, expect, it } from 'vite-plus/test'
import {
  cleanServiceWorkerUrl,
  getWatchedFiles,
  hasServiceWorkerQuery,
  injectDevQuery,
  parseServiceWorkerQuery,
  transformDev
} from './dev.ts'

describe('injectDevQuery', () => {
  it('should inject query parameter to URL without query', () => {
    const result = injectDevQuery('./sw.js')
    expect(result).toBe('./sw.js?sw=service_worker_file')
  })

  it('should inject query parameter to URL with existing query', () => {
    const result = injectDevQuery('./sw.js?v=123')
    expect(result).toBe('./sw.js?v=123&sw=service_worker_file')
  })
})

describe('hasServiceWorkerQuery', () => {
  it('should return true when URL has Service Worker query', () => {
    expect(hasServiceWorkerQuery('./sw.js?sw=service_worker_file')).toBe(true)
  })

  it('should return false when URL does not have Service Worker query', () => {
    expect(hasServiceWorkerQuery('./sw.js')).toBe(false)
    expect(hasServiceWorkerQuery('./sw.js?v=123')).toBe(false)
  })
})

describe('parseServiceWorkerQuery', () => {
  it('should return parsed query info for Service Worker URL', () => {
    const result = parseServiceWorkerQuery('./sw.js?sw=service_worker_file')
    expect(result).toEqual({ isServiceWorker: true })
  })

  it('should return null for non-Service Worker URL', () => {
    const result = parseServiceWorkerQuery('./sw.js')
    expect(result).toBeNull()
  })
})

describe('cleanServiceWorkerUrl', () => {
  it('should remove query from URL', () => {
    const result = cleanServiceWorkerUrl('./sw.js?sw=service_worker_file')
    expect(result).toBe('./sw.js')
  })

  it('should return URL as-is if no query', () => {
    const result = cleanServiceWorkerUrl('./sw.js')
    expect(result).toBe('./sw.js')
  })
})

describe('transformDev', () => {
  it('should transform Service Worker URL with query parameter', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const result = transformDev(code, '/project/src/main.ts')

    expect(result).not.toBeNull()
    expect(result!.code).toContain('sw=service_worker_file')
    expect(result!.map).toBeDefined()
  })

  it('should transform multiple Service Workers', () => {
    const code = `
      createSvcWorkerController({ scriptURL: new URL('./sw1.js', import.meta.url) })
      createSvcWorkerController({ scriptURL: new URL('./sw2.js', import.meta.url) })
    `
    const result = transformDev(code, '/project/src/main.ts')

    expect(result).not.toBeNull()
    expect(result!.code).toContain('./sw1.js?sw=service_worker_file')
    expect(result!.code).toContain('./sw2.js?sw=service_worker_file')
  })

  it('should return null when no Service Workers detected', () => {
    const code = `new Worker('./worker.js')`
    const result = transformDev(code, '/project/src/main.ts')

    expect(result).toBeNull()
  })

  it('should return null for code in comments', () => {
    const code = `
      // createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })
      const x = 1
    `
    const result = transformDev(code, '/project/src/main.ts')

    expect(result).toBeNull()
  })
})

describe('getWatchedFiles', () => {
  it('should return list of Service Worker file paths', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const result = getWatchedFiles(code, '/project/src/main.ts')

    expect(result).toHaveLength(1)
    expect(result[0]).toContain('sw.js')
  })

  it('should return empty array when no Service Workers', () => {
    const code = `new Worker('./worker.js')`
    const result = getWatchedFiles(code, '/project/src/main.ts')

    expect(result).toHaveLength(0)
  })
})
