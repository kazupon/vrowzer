import { describe, expect, test } from 'vite-plus/test'
import { Hono } from 'hono'
import { beforeRequestMiddleware } from './beforeRequest'
import { crossOriginMiddleware } from './crossOrigin'

function createApp(beforeRequest: (request: Request) => Promise<Response | undefined>) {
  const app = new Hono()
  app.use(crossOriginMiddleware())
  app.use(beforeRequestMiddleware(beforeRequest))
  app.get('*', c => c.text('served'))
  return app
}

describe('beforeRequestMiddleware', () => {
  test('waits for the hook before handling the request', async () => {
    let release!: () => void
    const app = createApp(() => new Promise(resolve => {
      release = () => resolve(undefined)
    }))

    let settled = false
    const response = app.request('/main.js').then((res) => {
      settled = true
      return res
    })
    for (let index = 0; index < 10; index++) {
      await Promise.resolve()
    }
    expect(settled).toBe(false)

    release()
    const res = await response
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('served')
  })

  test('handles the request as usual when the hook resolves to undefined', async () => {
    const app = createApp(async () => undefined)

    const res = await app.request('/main.js')

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('served')
  })

  test('answers with the response of the hook, with the headers of earlier middlewares', async () => {
    const app = createApp(async () => new Response('not ready', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    }))

    const res = await app.request('/main.js')

    expect(res.status).toBe(503)
    expect(await res.text()).toBe('not ready')
    expect(res.headers.get('Content-Type')).toBe('text/plain')
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  test('passes the request to the hook', async () => {
    const requests: Request[] = []
    const app = createApp(async (request) => {
      requests.push(request)
      return undefined
    })

    await app.request('http://localhost/__preview__/main.js?import', {
      headers: { Accept: 'text/javascript' },
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]!.url).toBe('http://localhost/__preview__/main.js?import')
    expect(requests[0]!.headers.get('Accept')).toBe('text/javascript')
  })
})
