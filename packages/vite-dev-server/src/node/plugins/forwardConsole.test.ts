import { stripVTControlCharacters } from 'node:util'
import { describe, expect, test, vi } from 'vite-plus/test'
import { forwardConsolePlugin } from './forwardConsole'

function setupPlugin() {
  let listener: ((payload: any) => void) | undefined
  const logger = {
    info: vi.fn<(...args: any[]) => void>(),
    warn: vi.fn<(...args: any[]) => void>(),
    error: vi.fn<(...args: any[]) => void>(),
  }
  const getModuleById = vi.fn<(id: string) => any>((id) => {
      if (id !== '/src/generated.js') {
        return undefined
      }
      return {
        id,
        transformResult: {
          code: 'throw new Error("boom")',
          map: {
            version: 3,
            file: '/src/generated.js',
            names: [],
            sources: ['/src/original.ts'],
            sourcesContent: ['throw new Error("boom")'],
            mappings: 'AAAA',
          },
        },
      }
    })
  const environment = {
    config: {
      base: '/__preview__/',
      root: '/',
      logger,
    },
    hot: {
      on: vi.fn<
        (event: string, handler: (payload: any) => void) => void
      >((_event, handler) => {
          listener = handler
        }),
    },
    moduleGraph: {
      getModuleById,
      getModulesByFile: vi.fn<(file: string) => undefined>(),
    },
  }
  const plugin = forwardConsolePlugin({ environments: ['client'] })

  ;(plugin.configureServer as Function)({
    environments: {
      client: environment,
    },
  })

  return {
    emit(payload: any) {
      expect(listener).toBeDefined()
      listener!(payload)
    },
    environment,
    getModuleById,
    logger,
  }
}

describe('forwardConsolePlugin', () => {
  test('maps console levels to the environment logger', () => {
    const { emit, logger } = setupPlugin()

    emit({
      type: 'log',
      data: { level: 'error', message: 'error message' },
    })
    emit({
      type: 'log',
      data: { level: 'warn', message: 'warn message' },
    })
    emit({
      type: 'log',
      data: { level: 'log', message: 'log message' },
    })

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[console.error] error message'),
      { timestamp: true },
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[console.warn] warn message'),
      { timestamp: true },
    )
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[console.log] log message'),
      { timestamp: true },
    )
  })

  test('strips the preview base before applying transform source maps', () => {
    const { emit, getModuleById, logger } = setupPlugin()

    emit({
      type: 'error',
      data: {
        name: 'Error',
        message: 'boom',
        stack:
          'Error: boom\n    at run (http://localhost/__preview__/src/generated.js:1:1)',
      },
    })

    expect(getModuleById).toHaveBeenCalledWith('/src/generated.js')
    const output = stripVTControlCharacters(logger.error.mock.calls[0][0])
    expect(output).toContain('[Unhandled error] Error: boom')
    expect(output).toContain('src/original.ts:1:0')
  })
})
