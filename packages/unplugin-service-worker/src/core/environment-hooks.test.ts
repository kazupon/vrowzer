import { describe, expect, it, vi } from 'vite-plus/test'
import { injectEnvironmentToHooks, resolvePluginsForEnvironment } from './environment-hooks.ts'

import type { Plugin } from 'rolldown'

describe('resolvePluginsForEnvironment', () => {
  const fakeEnvironment = { name: 'client', config: { isBundled: true } }

  it('should keep plugins without applyToEnvironment', async () => {
    const plugin: Plugin = { name: 'test-plugin' }

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin])).resolves.toEqual([plugin])
  })

  it('should keep the original plugin when applyToEnvironment returns true', async () => {
    const applyToEnvironment = vi.fn<(environment: unknown) => boolean>().mockReturnValue(true)
    const plugin = { name: 'test-plugin', applyToEnvironment } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin])).resolves.toEqual([plugin])
    expect(applyToEnvironment).toHaveBeenCalledWith(fakeEnvironment)
  })

  it('should omit the plugin when applyToEnvironment returns false', async () => {
    const plugin = {
      name: 'test-plugin',
      applyToEnvironment: () => false
    } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin])).resolves.toEqual([])
  })

  it('should use a replacement plugin returned by applyToEnvironment', async () => {
    const replacement: Plugin = { name: 'replacement-plugin', options: () => undefined }
    const plugin = {
      name: 'test-plugin',
      applyToEnvironment: () => replacement
    } as unknown as Plugin

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin])).resolves.toEqual([
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

    await expect(resolvePluginsForEnvironment(fakeEnvironment, [plugin])).resolves.toEqual([
      replacementA,
      replacementB
    ])
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
