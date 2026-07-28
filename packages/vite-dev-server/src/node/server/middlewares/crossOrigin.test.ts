import { describe, expect, test } from 'vite-plus/test'
import { Hono } from 'hono'
import { crossOriginMiddleware } from './crossOrigin'

describe('crossOriginMiddleware', () => {
  test('should set Cross-Origin-Resource-Policy header to same-origin', async () => {
    const app = new Hono()
    app.use(crossOriginMiddleware())
    app.get('*', c => c.text('ok'))

    const res = await app.request('/')

    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
  })

  test('should set Cross-Origin-Embedder-Policy header to require-corp', async () => {
    const app = new Hono()
    app.use(crossOriginMiddleware())
    app.get('*', c => c.text('ok'))

    const res = await app.request('/')

    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
  })

  test('should set Cross-Origin-Opener-Policy header to same-origin', async () => {
    const app = new Hono()
    app.use(crossOriginMiddleware())
    app.get('*', c => c.text('ok'))

    const res = await app.request('/')

    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  test('should pass through to next middleware', async () => {
    const app = new Hono()
    app.use(crossOriginMiddleware())
    app.get('/test', c => c.text('hello'))

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello')
  })
})
