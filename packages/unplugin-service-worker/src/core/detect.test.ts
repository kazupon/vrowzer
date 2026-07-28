import { describe, expect, it } from 'vite-plus/test'
import { detectServiceWorkers, hasServiceWorkerController } from './detect.ts'

describe('hasServiceWorkerController', () => {
  it('should return true when code contains createSvcWorkerController', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    expect(hasServiceWorkerController(code)).toBe(true)
  })

  it('should return false when code does not contain createSvcWorkerController', () => {
    const code = `new Worker('./worker.js')`
    expect(hasServiceWorkerController(code)).toBe(false)
  })
})

describe('detectServiceWorkers', () => {
  it('should detect single quotes path', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.urlPath).toBe('./sw.js')
  })

  it('should detect double quotes path', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL("./sw.js", import.meta.url) })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.urlPath).toBe('./sw.js')
  })

  it('should detect backtick path', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL(\`./sw.js\`, import.meta.url) })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.urlPath).toBe('./sw.js')
  })

  it('should detect with additional options', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url), version: '1.0.0', scope: '/' })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.urlPath).toBe('./sw.js')
  })

  it('should detect multiline code', () => {
    const code = `
      createSvcWorkerController({
        scriptURL: new URL('./sw.js', import.meta.url),
        version: '1.0.0'
      })
    `
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.urlPath).toBe('./sw.js')
  })

  it('should return correct indices', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.startIndex).toBeGreaterThan(0)
    expect(results[0]!.endIndex).toBeGreaterThan(results[0]!.startIndex)
    expect(results[0]!.urlExpression).toBe("new URL('./sw.js', import.meta.url)")
  })

  it('should return empty array when no match', () => {
    const code = `new Worker('./worker.js')`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(0)
  })

  it('should skip dynamic template literals', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL(\`./sw-\${version}.js\`, import.meta.url) })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(0)
  })

  it('should ignore matches inside comments', () => {
    const code = `
      // createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })
      const x = 1
    `
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(0)
  })

  it('should ignore matches inside string literals', () => {
    const code = `
      const str = "createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url) })"
    `
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(0)
  })

  it('should detect multiple service workers', () => {
    const code = `
      createSvcWorkerController({ scriptURL: new URL('./sw1.js', import.meta.url) })
      createSvcWorkerController({ scriptURL: new URL('./sw2.js', import.meta.url) })
    `
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(2)
    expect(results[0]!.urlPath).toBe('./sw1.js')
    expect(results[1]!.urlPath).toBe('./sw2.js')
  })

  it('should handle absolute paths', () => {
    const code = `createSvcWorkerController({ scriptURL: new URL('/sw.js', import.meta.url) })`
    const results = detectServiceWorkers(code)
    expect(results).toHaveLength(1)
    expect(results[0]!.urlPath).toBe('/sw.js')
  })
})
