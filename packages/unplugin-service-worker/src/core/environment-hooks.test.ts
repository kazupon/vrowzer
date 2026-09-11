import { describe, expect, it, vi } from 'vite-plus/test'
import { createLogger, resolveConfig } from 'vite-plus'
import { rolldown } from 'rolldown'
import { ServiceWorkerPlugin } from '../index.ts'
import { injectEnvironmentToHooks, resolvePluginsForEnvironment } from './environment-hooks.ts'

import type { FunctionPluginHooks, Plugin, PluginContext, ResolveFileUrlArgs } from 'rolldown'
import type { Logger } from 'vite'

describe('resolvePluginsForEnvironment', () => {
  const fakeEnvironment = { name: 'client', config: { isBundled: true } }
  const logger = createLogger('silent')

  it('should keep plugins without applyToEnvironment', async () => {
    const plugin: Plugin = { name: 'test-plugin' }

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin], logger)).resolves.toEqual([
      plugin
    ])
  })

  it('should keep the original plugin when applyToEnvironment returns true', async () => {
    const applyToEnvironment = vi.fn<(environment: unknown) => boolean>().mockReturnValue(true)
    const plugin = { name: 'test-plugin', applyToEnvironment } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin], logger)).resolves.toEqual([
      plugin
    ])
    expect(applyToEnvironment).toHaveBeenCalledWith(fakeEnvironment)
  })

  it('should omit the plugin when applyToEnvironment returns false', async () => {
    const plugin = {
      name: 'test-plugin',
      applyToEnvironment: () => false
    } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin], logger)).resolves.toEqual(
      []
    )
  })

  it('should use a replacement plugin returned by applyToEnvironment', async () => {
    const replacement: Plugin = { name: 'replacement-plugin', options: () => undefined }
    const plugin = {
      name: 'test-plugin',
      applyToEnvironment: () => replacement
    } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin], logger)).resolves.toEqual([
      replacement
    ])
  })

  it('should flatten asynchronous nested plugin options and remove falsy entries', async () => {
    const replacementA: Plugin = { name: 'replacement-a' }
    const replacementB: Plugin = { name: 'replacement-b' }
    const plugin = {
      name: 'test-plugin',
      applyToEnvironment: () =>
        Promise.resolve([replacementA, Promise.resolve([false, replacementB])])
    } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin], logger)).resolves.toEqual([
      replacementA,
      replacementB
    ])
  })

  describe('ignored Vite hooks', () => {
    it('should warn once without executing hooks across environments and repeated resolution', async () => {
      const warn = vi.fn<Console['warn']>()
      const logger = createLogger('warn', {
        allowClearScreen: false,
        console: { warn } as unknown as Console
      })
      const config = vi.fn<() => void>()
      const configEnvironment = vi.fn<() => void>()
      const configureServer = vi.fn<() => void>()
      const configResolved = vi.fn<() => void>()
      const returned = {
        name: 'test:environment-plugin',
        config,
        configEnvironment,
        configureServer,
        configResolved,
        resolveId: () => null
      }
      const plugin = { name: 'test:parent', applyToEnvironment: () => returned }

      for (const name of ['client', 'ssr', 'client']) {
        const resolved = await resolvePluginsForEnvironment({ name }, [plugin], logger)
        expect(resolved).toEqual([returned])
        expect(resolved[0]).toBe(returned)
      }

      expect(warn).toHaveBeenCalledExactlyOnceWith(
        'Plugin "test:environment-plugin" defines Vite-specific hooks (config, configEnvironment, configureServer, configResolved) in a plugin returned from applyToEnvironment. These hooks will be ignored.'
      )
      expect(config).not.toHaveBeenCalled()
      expect(configEnvironment).not.toHaveBeenCalled()
      expect(configureServer).not.toHaveBeenCalled()
      expect(configResolved).not.toHaveBeenCalled()
    })

    it.each(['config', 'configEnvironment', 'configureServer', 'configResolved'] as const)(
      'should warn about an object-form %s hook using the supplied logger',
      async hookName => {
        const logger = { warnOnce: vi.fn<Logger['warnOnce']>() }
        const handler = vi.fn<() => void>()
        const returned = { name: 'test:object-hook', [hookName]: { handler } }
        const plugin = { name: 'test:parent', applyToEnvironment: () => returned }

        const resolved = await resolvePluginsForEnvironment(fakeEnvironment, [plugin], logger)

        expect(resolved[0]).toBe(returned)
        expect(logger.warnOnce).toHaveBeenCalledExactlyOnceWith(
          `Plugin "test:object-hook" defines Vite-specific hooks (${hookName}) in a plugin returned from applyToEnvironment. These hooks will be ignored.`
        )
        expect(logger.warnOnce.mock.contexts[0]).toBe(logger)
        expect(handler).not.toHaveBeenCalled()
      }
    )

    it('should preserve plugin selection without warning about ordinary or supported plugins', async () => {
      const logger = { warnOnce: vi.fn<Logger['warnOnce']>() }
      const ordinary = { name: 'test:ordinary', config: () => undefined }
      const retained = {
        name: 'test:retained',
        applyToEnvironment: () => true,
        configResolved: () => undefined
      }
      const supported = { name: 'test:supported', config: undefined, resolveId: () => null }
      const tail = { name: 'test:tail' }
      const plugins = [
        ordinary,
        retained,
        {
          name: 'test:false',
          applyToEnvironment: async () => false,
          configResolved: () => undefined
        },
        { name: 'test:null', applyToEnvironment: () => null },
        { name: 'test:undefined', applyToEnvironment: () => undefined },
        { name: 'test:parent', applyToEnvironment: async () => supported },
        tail
      ]

      await expect(resolvePluginsForEnvironment(fakeEnvironment, plugins, logger)).resolves.toEqual(
        [ordinary, retained, supported, tail]
      )
      expect(logger.warnOnce).not.toHaveBeenCalled()
    })

    it('should preserve nested Promise plugin order and skip falsy entries when warning', async () => {
      const logger = { warnOnce: vi.fn<Logger['warnOnce']>() }
      const first = { name: 'test:first', resolveId: () => null }
      const handler = vi.fn<() => void>()
      const ignored = { name: 'test:ignored', config: handler }
      const last = { name: 'test:last' }
      const tail = { name: 'test:tail' }
      const plugin = {
        name: 'test:parent',
        applyToEnvironment: async () => [
          false,
          Promise.resolve([first, null, [Promise.resolve(ignored), undefined]]),
          Promise.resolve(false),
          last
        ]
      }

      await expect(
        resolvePluginsForEnvironment(fakeEnvironment, [plugin, tail], logger)
      ).resolves.toEqual([first, ignored, last, tail])
      expect(logger.warnOnce).toHaveBeenCalledExactlyOnceWith(
        'Plugin "test:ignored" defines Vite-specific hooks (config) in a plugin returned from applyToEnvironment. These hooks will be ignored.'
      )
      expect(handler).not.toHaveBeenCalled()
    })

    it.each(['serve', 'build'] as const)(
      'should forward warnings through the host Environment logger for %s',
      async command => {
        const warn = vi.fn<Console['warn']>()
        const logger = createLogger('warn', {
          allowClearScreen: false,
          console: { warn } as unknown as Console
        })
        const warnOnce = vi.spyOn(logger, 'warnOnce')
        const handler = vi.fn<() => void>()
        const returned = { name: 'test:host-returned', configResolved: handler }
        const warning =
          'Plugin "test:host-returned" defines Vite-specific hooks (configResolved) in a plugin returned from applyToEnvironment. These hooks will be ignored.'

        await resolveConfig(
          {
            configFile: false,
            customLogger: logger,
            plugins: [
              ServiceWorkerPlugin.vite(),
              { name: 'test:host-parent', applyToEnvironment: () => returned }
            ]
          },
          command
        )

        expect(warnOnce).toHaveBeenCalledWith(
          warning,
          expect.objectContaining({ environment: expect.stringContaining('(client)') })
        )
        expect(warn).toHaveBeenCalledExactlyOnceWith(warning)
        expect(handler).not.toHaveBeenCalled()
      }
    )
  })
})

describe('injectEnvironmentToHooks', () => {
  const fakeEnvironment = { name: 'client', config: { consumer: 'client' } }

  describe('cloning', () => {
    it('should return a new plugin object (not mutate original)', () => {
      const original: Plugin = {
        name: 'test-plugin',
        resolveId(_id) {
          return null
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)

      expect(wrapped).not.toBe(original)
      expect(wrapped.name).toBe('test-plugin')
    })

    it('should preserve non-hook properties', () => {
      const original = {
        name: 'test-plugin',
        enforce: 'pre'
      } as Plugin

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)

      expect(wrapped.name).toBe('test-plugin')
      expect((wrapped as unknown as Record<string, unknown>).enforce).toBe('pre')
    })
  })

  describe('resolveId hook', () => {
    it('should inject environment into resolveId context', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        resolveId(this: unknown, _id: string) {
          capturedContext = this
          return null
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedResolveId = wrapped.resolveId as Function
      await wrappedResolveId.call({}, 'test-id', undefined, {})

      expect(capturedContext).toBeDefined()
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })

    it('should pass arguments through to resolveId', async () => {
      const spy = vi.fn().mockReturnValue(null)
      const original = {
        name: 'test-plugin',
        resolveId: spy
      } as unknown as Plugin

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedResolveId = wrapped.resolveId as Function
      await wrappedResolveId.call({}, 'test-id', '/importer.ts', { isEntry: true })

      expect(spy).toHaveBeenCalledWith('test-id', '/importer.ts', { isEntry: true })
    })

    it('should handle object-form resolveId with handler', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        resolveId: {
          handler(this: unknown, _id: string) {
            capturedContext = this
            return null
          },
          order: 'pre' as const
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const resolveIdHook = wrapped.resolveId as { handler: Function; order: string }
      expect(resolveIdHook.order).toBe('pre')

      await resolveIdHook.handler.call({}, 'test-id', undefined, {})
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })

    it('should handle undefined resolveId gracefully', () => {
      const original: Plugin = {
        name: 'test-plugin'
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      expect(wrapped.resolveId).toBeUndefined()
    })
  })

  describe('load hook', () => {
    it('should inject environment into load context', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        load(this: unknown, _id: string) {
          capturedContext = this
          return null
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedLoad = wrapped.load as Function
      await wrappedLoad.call({}, '/test/file.ts')

      expect(capturedContext).toBeDefined()
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })

    it('should pass arguments through to load', async () => {
      const spy = vi.fn().mockReturnValue(null)
      const original = {
        name: 'test-plugin',
        load: spy
      } as unknown as Plugin

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedLoad = wrapped.load as Function
      await wrappedLoad.call({}, '/test/file.ts')

      expect(spy).toHaveBeenCalledWith('/test/file.ts')
    })
  })

  describe('transform hook', () => {
    it('should inject environment into transform context', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        transform(this: unknown, _code: string, _id: string) {
          capturedContext = this
          return null
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedTransform = wrapped.transform as Function
      await wrappedTransform.call({}, 'const x = 1', '/test/file.ts')

      expect(capturedContext).toBeDefined()
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })

    it('should pass arguments through to transform', async () => {
      const spy = vi.fn().mockReturnValue(null)
      const original = {
        name: 'test-plugin',
        transform: spy
      } as unknown as Plugin

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedTransform = wrapped.transform as Function
      await wrappedTransform.call({}, 'const x = 1', '/test/file.ts')

      expect(spy).toHaveBeenCalledWith('const x = 1', '/test/file.ts')
    })

    it('should handle object-form transform with handler and filter', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        transform: {
          handler(this: unknown, _code: string, _id: string) {
            capturedContext = this
            return null
          },
          filter: { id: { include: /\.ts$/ } }
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const transformHook = wrapped.transform as { handler: Function; filter: unknown }
      expect(transformHook.filter).toEqual({ id: { include: /\.ts$/ } })

      await transformHook.handler.call({}, 'code', '/test.ts')
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })
  })

  describe('resolveFileUrl hook', () => {
    const args: ResolveFileUrlArgs = {
      chunkId: 'entry.js',
      fileName: 'assets/message.txt',
      format: 'es',
      moduleId: '/entry.js',
      referenceId: 'asset-ref',
      relativePath: 'assets/message.txt',
      urlId: 'workerAsset'
    }

    it.each([JSON.stringify('/preview/assets/message.txt'), null, undefined])(
      'should inject environment and preserve a %s result synchronously',
      result => {
        const handler = vi.fn<FunctionPluginHooks['resolveFileUrl']>(() => result)
        const original: Plugin = { name: 'test-plugin', resolveFileUrl: handler }
        const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
        const wrappedHandler = wrapped.resolveFileUrl as FunctionPluginHooks['resolveFileUrl']
        const context = {} as PluginContext & { environment?: unknown }

        expect(wrappedHandler.call(context, args)).toBe(result)
        expect(handler).toHaveBeenCalledExactlyOnceWith(args)
        expect(handler.mock.calls[0]![0]).toBe(args)
        expect(handler.mock.contexts[0]).toBe(context)
        expect(context.environment).toBe(fakeEnvironment)
        expect(wrapped).not.toBe(original)
        expect(original.resolveFileUrl).toBe(handler)
      }
    )

    it('should preserve object-hook properties and the plugin prototype without mutating them', () => {
      const metadata = { kind: 'asset-url' }
      const handler = vi.fn<FunctionPluginHooks['resolveFileUrl']>(() => '"asset-url"')
      class AssetPlugin {
        name = 'test-plugin'
        resolveFileUrl = { handler, order: 'pre' as const, metadata }
      }
      const original = new AssetPlugin()
      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedHook = wrapped.resolveFileUrl as typeof original.resolveFileUrl
      const context = {} as PluginContext & { environment?: unknown }

      expect(wrapped).not.toBe(original)
      expect(Object.getPrototypeOf(wrapped)).toBe(AssetPlugin.prototype)
      expect(wrappedHook).not.toBe(original.resolveFileUrl)
      expect(wrappedHook.order).toBe('pre')
      expect(wrappedHook.metadata).toBe(metadata)
      expect(wrappedHook.handler.call(context, args)).toBe('"asset-url"')
      expect(context.environment).toBe(fakeEnvironment)
      expect(handler).toHaveBeenCalledExactlyOnceWith(args)
      expect(original.resolveFileUrl.handler).toBe(handler)
      expect(original.resolveFileUrl.metadata).toBe(metadata)
    })

    it('should preserve an existing environment in the resolveFileUrl context', () => {
      const existingEnvironment = { name: 'existing' }
      const handler = vi.fn<FunctionPluginHooks['resolveFileUrl']>(() => null)
      const original: Plugin = { name: 'test-plugin', resolveFileUrl: handler }
      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedHandler = wrapped.resolveFileUrl as FunctionPluginHooks['resolveFileUrl']
      const context = { environment: existingEnvironment } as unknown as PluginContext

      expect(wrappedHandler).not.toBe(handler)
      expect(wrappedHandler.call(context, args)).toBeNull()
      expect(handler.mock.contexts[0]).toBe(context)
      expect(context).toHaveProperty('environment', existingEnvironment)
    })

    it('should not add a resolveFileUrl hook when it is absent', () => {
      const wrapped = injectEnvironmentToHooks(fakeEnvironment, { name: 'test-plugin' })
      expect(wrapped).not.toHaveProperty('resolveFileUrl')
    })

    it.each([undefined, 'workerAsset'])(
      'should resolve emitted assets in real Rolldown with urlId %s',
      async urlId => {
        const environment = {
          name: 'client',
          mode: 'build',
          config: { base: '/preview/', isWorker: true, isBundled: true }
        }
        const entryId = '\0virtual:asset-entry'
        let referenceId: string | undefined
        const resolveFileUrl = vi.fn<FunctionPluginHooks['resolveFileUrl']>(function (details) {
          const context = this as PluginContext & { environment: typeof environment }
          return JSON.stringify(`${context.environment.config.base}${details.fileName}`)
        })
        const bundle = await rolldown({
          input: entryId,
          plugins: [
            {
              name: 'test:emit-asset',
              resolveId(id) {
                return id === entryId ? id : null
              },
              load(id) {
                if (id !== entryId) {
                  return null
                }
                referenceId = this.emitFile({
                  type: 'asset',
                  fileName: 'assets/message.txt',
                  source: 'worker asset'
                })
                return `export default import.meta.ROLLDOWN_FILE_URL_${referenceId}${urlId ? `_${urlId}` : ''}`
              }
            },
            injectEnvironmentToHooks(environment, { name: 'test:asset-url', resolveFileUrl })
          ]
        })

        try {
          const { output } = await bundle.generate({ format: 'es', entryFileNames: 'entry.js' })
          const chunk = output.find(item => item.type === 'chunk')
          const asset = output.find(item => item.type === 'asset')

          expect(resolveFileUrl).toHaveBeenCalledOnce()
          expect(resolveFileUrl.mock.contexts[0]).toHaveProperty('environment', environment)
          expect(resolveFileUrl.mock.calls[0]![0]).toMatchObject({
            chunkId: 'entry.js',
            fileName: 'assets/message.txt',
            format: 'es',
            moduleId: entryId,
            referenceId,
            relativePath: 'assets/message.txt'
          })
          expect(resolveFileUrl.mock.calls[0]![0].urlId).toBe(urlId)
          expect(chunk?.code).toContain('"/preview/assets/message.txt"')
          expect(chunk?.code).not.toContain('ROLLDOWN_FILE_URL_')
          expect(asset).toMatchObject({ fileName: 'assets/message.txt', source: 'worker asset' })
        } finally {
          await bundle.close()
        }
      }
    )
  })

  describe('generic hooks', () => {
    it('should inject environment into buildStart hook', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        buildStart(this: unknown) {
          capturedContext = this
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedBuildStart = wrapped.buildStart as Function
      await wrappedBuildStart.call({})

      expect(capturedContext).toBeDefined()
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })

    it('should inject environment into renderChunk hook', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        renderChunk(this: unknown, _code: string) {
          capturedContext = this
          return null
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedRenderChunk = wrapped.renderChunk as Function
      await wrappedRenderChunk.call({}, 'code', {})

      expect(capturedContext).toBeDefined()
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })

    it('should inject environment into generateBundle hook', async () => {
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        generateBundle(this: unknown) {
          capturedContext = this
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedGenerateBundle = wrapped.generateBundle as Function
      await wrappedGenerateBundle.call({}, {}, {})

      expect(capturedContext).toBeDefined()
      expect((capturedContext as { environment: unknown }).environment).toBe(fakeEnvironment)
    })
  })

  describe('environment preservation', () => {
    it('should not overwrite existing environment in context', async () => {
      const existingEnvironment = { name: 'existing' }
      let capturedContext: unknown = null
      const original: Plugin = {
        name: 'test-plugin',
        resolveId(this: unknown) {
          capturedContext = this
          return null
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      const wrappedResolveId = wrapped.resolveId as Function
      await wrappedResolveId.call({ environment: existingEnvironment }, 'test-id', undefined, {})

      // Should keep the existing environment (??= only sets if nullish)
      expect((capturedContext as { environment: unknown }).environment).toBe(existingEnvironment)
    })
  })

  describe('non-hook properties', () => {
    it('should not wrap non-rolldown-hook properties', () => {
      const customFn = vi.fn()
      const original: Plugin = {
        name: 'test-plugin',
        // @ts-expect-error -- testing custom property
        customProperty: customFn
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)
      // customProperty is not in ROLLDOWN_HOOKS, so it should be the original

      // oxlint-disable-next-line typescript/no-unsafe-member-access -- ignore for testing
      expect((wrapped as any).customProperty).toBe(customFn)
    })
  })

  describe('plugin with multiple hooks', () => {
    it('should wrap all hooks correctly', async () => {
      const contexts: Record<string, unknown> = {}
      const original: Plugin = {
        name: 'multi-hook-plugin',
        resolveId(this: unknown) {
          contexts.resolveId = this
          return null
        },
        load(this: unknown) {
          contexts.load = this
          return null
        },
        transform(this: unknown) {
          contexts.transform = this
          return null
        },
        buildStart(this: unknown) {
          contexts.buildStart = this
        }
      }

      const wrapped = injectEnvironmentToHooks(fakeEnvironment, original)

      await (wrapped.resolveId as Function).call({}, 'id', undefined, {})
      await (wrapped.load as Function).call({}, 'id')
      await (wrapped.transform as Function).call({}, 'code', 'id')
      await (wrapped.buildStart as Function).call({})

      for (const [hookName, ctx] of Object.entries(contexts)) {
        expect(
          (ctx as { environment: unknown }).environment,
          `${hookName} should have environment injected`
        ).toBe(fakeEnvironment)
      }
    })
  })
})
