import { describe, expect, it } from 'vite-plus/test'
import { shouldHandleViteFetch } from './serviceWorkerFetch'

const WORKER_ORIGIN = 'https://host.example'
const PREVIEW_BASE = '/__preview__/'

describe('shouldHandleViteFetch', () => {
  it.each([
    ['preview root without a trailing slash', 'https://host.example/__preview__'],
    ['preview root with a trailing slash', 'https://host.example/__preview__/'],
    ['preview HTML', 'https://host.example/__preview__/index.html'],
    ['preview JavaScript', 'https://host.example/__preview__/src/main.ts'],
    ['preview CSS', 'https://host.example/__preview__/src/main.css'],
    ['preview image', 'https://host.example/__preview__/public/logo.png'],
    [
      'preview URL with a query and hash',
      'https://host.example/__preview__/main.ts?import&v=1#fragment'
    ],
    [
      'unmarked asset with an internal asset file name',
      'https://host.example/__preview__/rolldown-worker.js'
    ]
  ])('handles same-origin %s', (_name, rawUrl) => {
    expect(shouldHandleViteFetch(rawUrl, WORKER_ORIGIN, PREVIEW_BASE)).toBe(true)
  })

  it.each([
    ['a path outside basePath', 'https://host.example/api/data'],
    ['a lookalike basePath', 'https://host.example/__preview__-other/main.ts'],
    ['a normalized parent path', 'https://host.example/__preview__/../api/data'],
    ['a different hostname', 'https://cdn.example/__preview__/logo.png'],
    ['a different port', 'https://host.example:8443/__preview__/main.ts'],
    ['a different scheme', 'http://host.example/__preview__/main.ts'],
    ['a blob URL', 'blob:https://host.example/2daee084-cf6b-4eb0-b40f-fc7c630780a2'],
    ['a data URL', 'data:text/plain,hello'],
    ['an extension URL', 'chrome-extension://abcdefghijklmnop/index.js'],
    [
      'the marked internal Rolldown worker',
      'https://host.example/__preview__/rolldown-worker.js?__vrowzer_internal_asset=rolldown'
    ],
    [
      'the marked internal Rolldown WASM',
      'https://host.example/__preview__/rolldown-binding.wasm32-wasi.wasm?__vrowzer_internal_asset=rolldown'
    ]
  ])('bypasses %s', (_name, rawUrl) => {
    expect(shouldHandleViteFetch(rawUrl, WORKER_ORIGIN, PREVIEW_BASE)).toBe(false)
  })

  it.each([
    ['the preview root', 'https://host.example/__preview__'],
    ['a preview descendant', 'https://host.example/__preview__/nested/main.ts']
  ])('supports a basePath without a trailing slash for %s', (_name, rawUrl) => {
    expect(shouldHandleViteFetch(rawUrl, WORKER_ORIGIN, '/__preview__')).toBe(true)
  })

  it('handles same-origin HTTP requests', () => {
    expect(
      shouldHandleViteFetch(
        'http://host.example/__preview__/src/main.ts',
        'http://host.example',
        PREVIEW_BASE
      )
    ).toBe(true)
  })

  it('handles regular same-origin requests when basePath is the origin root', () => {
    expect(
      shouldHandleViteFetch('https://host.example/src/main.ts', WORKER_ORIGIN, '/')
    ).toBe(true)
  })

  it('still bypasses internal assets when basePath is the origin root', () => {
    expect(
      shouldHandleViteFetch(
        'https://host.example/assets/rolldown-worker.js?__vrowzer_internal_asset=rolldown',
        WORKER_ORIGIN,
        '/'
      )
    ).toBe(false)
  })

  it('bypasses an invalid URL without throwing', () => {
    expect(shouldHandleViteFetch('not a URL', WORKER_ORIGIN, PREVIEW_BASE)).toBe(false)
  })
})
