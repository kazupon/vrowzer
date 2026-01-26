import { describe, expect, test, vi } from 'vitest'
import { createHMRHandler } from './hmrHandler'

describe('createHMRHandler', () => {
  test('resolve', async () => {
    const handler = vi.fn().mockImplementation(async (_) => Promise.resolve())
    const hmrHandler = createHMRHandler(handler)
    await hmrHandler({ type: 'custom', event: 'test' })
    expect(handler).toHaveBeenCalledWith({ type: 'custom', event: 'test' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('reject', async () => {
    const handler = vi
      .fn()
      .mockImplementation(async (_) =>
        Promise.reject(new Error('Test error')),
      )
    const hmrHandler = createHMRHandler(handler)
    await expect(
      hmrHandler({ type: 'custom', event: 'test' }),
    ).rejects.toThrowError('Test error')
    expect(handler).toHaveBeenCalledWith({ type: 'custom', event: 'test' })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
