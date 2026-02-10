import { describe, expect, test } from 'vitest'
import { Hono } from 'hono'
import { notFoundMiddleware } from './notFound'

describe('notFoundMiddleware', () => {
  test('should return 404 status', async () => {
    const app = new Hono()
    app.use(notFoundMiddleware())

    const res = await app.request('/anything')

    expect(res.status).toBe(404)
  })

  test('should return empty body', async () => {
    const app = new Hono()
    app.use(notFoundMiddleware())

    const res = await app.request('/anything')
    const body = await res.text()

    expect(body).toBe('')
  })
})
