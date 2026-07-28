import { Hono } from 'hono'
import type { RollupError } from 'rolldown'
import { describe, expect, test, vi } from 'vite-plus/test'
import type { ViteDevServer, ViteEnv } from '../index'
import {
  buildErrorMessage,
  cleanStack,
  errorMiddleware,
  prepareError,
} from './error'

describe('prepareError', () => {
  test('should extract message and stack from error', () => {
    const err = new Error('test error')
    err.stack = 'Error: test error\n  at foo (file.ts:1:1)\n  at bar (file.ts:2:2)'
    const result = prepareError(err)

    expect(result.message).toBe('test error')
    expect(result.stack).toContain('at foo')
    expect(result.stack).toContain('at bar')
  })

  test('should strip ANSI escape sequences', () => {
    const err = new Error('\u001B[31mred error\u001B[0m')
    err.stack = 'Error\n  \u001B[33mat foo (file.ts:1:1)\u001B[0m'
    const result = prepareError(err)

    expect(result.message).toBe('red error')
    expect(result.stack).not.toContain('\u001B')
  })

  test('should extract RollupError specific properties', () => {
    const err = new Error('plugin error') as RollupError
    err.id = '/src/main.ts'
    err.frame = '  1 | const x = 1'
    err.plugin = 'vite:css'
    err.pluginCode = 'CSS_ERROR' as any
    err.loc = { file: '/src/main.ts', line: 1, column: 0 }
    err.stack = 'Error\n  at foo (file.ts:1:1)'

    const result = prepareError(err)

    expect(result.id).toBe('/src/main.ts')
    expect(result.frame).toBe('  1 | const x = 1')
    expect(result.plugin).toBe('vite:css')
    expect(result.pluginCode).toBe('CSS_ERROR')
    expect(result.loc).toEqual({ file: '/src/main.ts', line: 1, column: 0 })
  })

  test('should handle error without stack', () => {
    const err = new Error('no stack')
    // @ts-expect-error -- simulate error without stack
    err.stack = undefined
    const result = prepareError(err)

    expect(result.stack).toBe('')
  })
})

describe('buildErrorMessage', () => {
  test('should include plugin info when present', () => {
    const err = { message: 'fail', plugin: 'vite:css' } as RollupError
    const result = buildErrorMessage(err, ['Error:'], false)

    expect(result).toContain('Plugin:')
    expect(result).toContain('vite:css')
  })

  test('should include file info when id is present', () => {
    const err = { message: 'fail', id: '/src/main.ts' } as RollupError
    const result = buildErrorMessage(err, ['Error:'], false)

    expect(result).toContain('File:')
    expect(result).toContain('/src/main.ts')
  })

  test('should include location in file info', () => {
    const err = {
      message: 'fail',
      id: '/src/main.ts',
      loc: { line: 10, column: 5 },
    } as RollupError
    const result = buildErrorMessage(err, ['Error:'], false)

    expect(result).toContain(':10:5')
  })

  test('should include stack when includeStack is true', () => {
    const err = {
      message: 'fail',
      stack: 'Error: fail\n  at foo (file.ts:1:1)',
    } as RollupError
    const result = buildErrorMessage(err, ['Error:'], true)

    expect(result).toContain('at foo')
  })
})

describe('cleanStack', () => {
  test('should keep only lines starting with "at"', () => {
    const stack = 'Error: fail\n  at foo (file.ts:1:1)\nsome noise\n  at bar (file.ts:2:2)'
    const result = cleanStack(stack)

    expect(result).toBe('  at foo (file.ts:1:1)\n  at bar (file.ts:2:2)')
  })
})

describe('errorMiddleware', () => {
  function createMockServer(base = '/'): ViteDevServer {
    return {
      config: {
        base,
        logger: {
          error: vi.fn(),
        },
      },
      environments: {
        client: {
          hot: {
            send: vi.fn(),
          },
        },
      },
    } as unknown as ViteDevServer
  }

  test('should return 500 status with HTML when allowNext is false', async () => {
    const server = createMockServer()
    const app = new Hono<ViteEnv>()

    app.get('/test', () => {
      throw new Error('test error')
    })
    app.onError(errorMiddleware(server, false))

    const res = await app.request('/test')

    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toContain('<!DOCTYPE html>')
    expect(body).toContain('test error')
  })

  test('should return 500 status with plain text when allowNext is true', async () => {
    const server = createMockServer()
    const app = new Hono<ViteEnv>()

    app.get('/test', () => {
      throw new Error('test error')
    })
    app.onError(errorMiddleware(server, true))

    const res = await app.request('/test')

    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toBe('Internal Server Error')
  })

  test('should call logError which logs and sends HMR error', async () => {
    const server = createMockServer()
    const app = new Hono<ViteEnv>()

    app.get('/test', () => {
      throw new Error('test error')
    })
    app.onError(errorMiddleware(server))

    await app.request('/test')

    expect(server.config.logger.error).toHaveBeenCalled()
    expect(server.environments.client.hot.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        err: expect.objectContaining({
          message: 'test error',
        }),
      }),
    )
  })
})
