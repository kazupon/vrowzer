import path from 'node:path'
import { rolldown } from 'rolldown'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { ServiceWorkerPlugin } from '../index.ts'
import { SW_FILE_ID, SW_QUERY } from './constants.ts'

import type { OutputChunk, Plugin } from 'rolldown'
import type { MockInstance } from 'vite-plus/test'
import type { Options } from './options.ts'

vi.mock('rolldown', async importOriginal => {
  const actual = await importOriginal<typeof import('rolldown')>()
  return { ...actual, rolldown: vi.fn<typeof actual.rolldown>() }
})

type Bundle = Awaited<ReturnType<typeof rolldown>>
type Middleware = (
  req: { url: string },
  res: {
    statusCode: number
    setHeader: (name: string, value: string) => void
    end: (body: string) => void
  },
  next: () => void
) => Promise<void>

const entryPath = path.resolve(__dirname, '__fixtures__/service-worker.ts')
const wasmPath = path.resolve(__dirname, '__fixtures__/minimal.wasm')
const code = 'self.wasmUrl = new URL("minimal.wasm", import.meta.url);'
// Model the generated chunks without the native binding's memory handles.
const generate =
  vi.fn<(...args: Parameters<Bundle['generate']>) => Promise<{ output: OutputChunk[] }>>()
const close = vi.fn<Bundle['close']>()
const lookupWasmFile = vi.fn<Map<string, string>['get']>()
let closeRealBundle: (() => Promise<void>) | undefined

function createRequest(options: Options = {}) {
  const use = vi.fn<(middleware: Middleware) => void>()
  const plugin = ServiceWorkerPlugin.vite({ serviceWorkerAllowed: '/', ...options })
  const configureServer = plugin.configureServer as (server: unknown) => void
  configureServer({
    config: { base: '/' },
    middlewares: { use },
    pluginContainer: { resolveId: async () => ({ id: entryPath }) }
  })
  const middleware = use.mock.calls[0]![0]
  const response = {
    statusCode: 200,
    setHeader: vi.fn<(name: string, value: string) => void>(),
    end: vi.fn<(body: string) => void>()
  }
  const next = vi.fn<() => void>()
  return {
    response,
    next,
    run: () => middleware({ url: `/service-worker.ts?${SW_QUERY}=${SW_FILE_ID}` }, response, next)
  }
}

beforeEach(() => {
  vi.mocked(rolldown).mockReset()
  generate.mockReset().mockResolvedValue({
    output: [{ type: 'chunk', isEntry: true, code } as OutputChunk]
  })
  close.mockReset().mockResolvedValue(undefined)
  lookupWasmFile.mockReset().mockReturnValue(wasmPath)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(rolldown).mockImplementation(async options => {
    const wasmPlugin = (options.plugins as (Plugin & { _wasmFiles?: Map<string, string> })[]).find(
      plugin => plugin.name === 'unplugin-service-worker:wasm-inline'
    )!
    const files = wasmPlugin._wasmFiles!
    files.set('minimal.wasm', wasmPath)
    files.get = lookupWasmFile
    return { generate, close } as unknown as Bundle
  })
})

afterEach(async () => {
  try {
    await closeRealBundle?.()
  } finally {
    closeRealBundle = undefined
    vi.restoreAllMocks()
  }
})

describe('Service Worker bundle cleanup through Vite middleware', () => {
  it.each(['iife', 'esm'] as const)(
    'should close once and preserve WASM inlining and response headers for %s',
    async format => {
      const request = createRequest({ format })
      await request.run()

      expect(generate).toHaveBeenCalledExactlyOnceWith({
        format,
        ...(format === 'esm' && { codeSplitting: false }),
        sourcemap: 'inline',
        minify: false
      })
      expect(close).toHaveBeenCalledExactlyOnceWith()
      expect(close.mock.invocationCallOrder[0]).toBeLessThan(
        lookupWasmFile.mock.invocationCallOrder[0]!
      )
      expect(lookupWasmFile).toHaveBeenCalledExactlyOnceWith('minimal.wasm')
      expect(request.response.statusCode).toBe(200)
      expect(request.response.end).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('self.wasmUrl = "data:application/wasm;base64,')
      )
      expect(request.response.setHeader).toHaveBeenCalledWith('Service-Worker-Allowed', '/')
      expect(request.response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/javascript; charset=utf-8'
      )
      expect(request.next).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    }
  )

  it('should await close before post-processing or sending the response', async () => {
    const closing = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    close.mockImplementationOnce(() => {
      started.resolve()
      return closing.promise
    })
    const request = createRequest()
    const running = request.run()
    try {
      await started.promise
      expect(lookupWasmFile).not.toHaveBeenCalled()
      expect(request.response.end).not.toHaveBeenCalled()
    } finally {
      closing.resolve()
      await running
    }
    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(lookupWasmFile).toHaveBeenCalledExactlyOnceWith('minimal.wasm')
    expect(request.response.statusCode).toBe(200)
  })

  it('should close once after generation fails and skip WASM post-processing', async () => {
    const error = new Error('generation failed')
    generate.mockRejectedValueOnce(error)
    const request = createRequest()
    await request.run()

    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(lookupWasmFile).not.toHaveBeenCalled()
    expect(request.response.statusCode).toBe(500)
    expect(request.response.end).toHaveBeenCalledExactlyOnceWith(
      'Failed to bundle Service Worker: generation failed'
    )
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      '[unplugin-service-worker] Failed to bundle Service Worker:',
      error
    )
  })

  it('should close once when no entry chunk is generated', async () => {
    generate.mockResolvedValueOnce({ output: [] })
    const request = createRequest()
    await request.run()

    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(lookupWasmFile).not.toHaveBeenCalled()
    expect(request.response.statusCode).toBe(500)
    expect(request.response.end).toHaveBeenCalledExactlyOnceWith('Failed to bundle Service Worker')
  })

  it.each([false, true])(
    'should report close failure without post-processing when generation failure is %s',
    async generationFails => {
      if (generationFails) {
        generate.mockRejectedValueOnce(new Error('generation failed'))
      }
      const error = new Error('close failed')
      close.mockRejectedValueOnce(error)
      const request = createRequest()
      await request.run()

      expect(close).toHaveBeenCalledExactlyOnceWith()
      expect(lookupWasmFile).not.toHaveBeenCalled()
      expect(request.response.statusCode).toBe(500)
      expect(request.response.end).toHaveBeenCalledExactlyOnceWith(
        'Failed to bundle Service Worker: close failed'
      )
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        '[unplugin-service-worker] Failed to bundle Service Worker:',
        error
      )
    }
  )

  it('should not try to close a bundle when its creation fails', async () => {
    vi.mocked(rolldown).mockRejectedValueOnce(new Error('creation failed'))
    const request = createRequest()
    await request.run()

    expect(generate).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect(lookupWasmFile).not.toHaveBeenCalled()
    expect(request.response.statusCode).toBe(500)
    expect(request.response.end).toHaveBeenCalledExactlyOnceWith(
      'Failed to bundle Service Worker: creation failed'
    )
  })

  it.each([false, true])(
    'should close a real Rolldown bundle with a syntax error of %s',
    async syntaxError => {
      const actual = await vi.importActual<typeof import('rolldown')>('rolldown')
      let realClose: MockInstance<Bundle['close']> | undefined
      vi.mocked(rolldown).mockImplementationOnce(async options => {
        const bundle = await actual.rolldown(options)
        const closeBundle = bundle.close.bind(bundle)
        realClose = vi.spyOn(bundle, 'close')
        closeRealBundle = async () => {
          if (!realClose?.mock.settledResults.some(result => result.type === 'fulfilled')) {
            await closeBundle()
          }
        }
        return bundle
      })
      const request = createRequest({
        format: 'esm',
        plugins: [
          {
            name: 'test:virtual-worker',
            resolveId(id) {
              return id === entryPath ? id : null
            },
            load(id) {
              return id === entryPath
                ? syntaxError
                  ? 'self.answer = {'
                  : 'self.answer = 42;'
                : null
            }
          }
        ]
      })
      await request.run()

      expect(realClose).toHaveBeenCalledExactlyOnceWith()
      expect(realClose?.mock.settledResults).toEqual([{ type: 'fulfilled', value: undefined }])
      expect(request.response.statusCode).toBe(syntaxError ? 500 : 200)
      expect(request.response.end).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining(
          syntaxError ? 'Failed to bundle Service Worker:' : 'self.answer = 42'
        )
      )
    }
  )
})
