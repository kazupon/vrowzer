import { describe, expect, it } from 'vite-plus/test'
import {
  filterServiceWorkerPlugins,
  resolveServiceWorkerPlugins,
  sanitizeDefine
} from '../index.ts'
import { rewriteEntryUrls, stripViteBase } from './entry-url.ts'

import type { Plugin } from 'rolldown'

describe('rewriteEntryUrls', () => {
  const id = '/project/node_modules/vrowzer/dist/index.js'
  const entry = '/project/node_modules/vrowzer/dist/service-worker.ts'
  const code = `const scriptURL = new URL('./service-worker.ts', import.meta.url)`

  it('should route an explicit entry through the Service Worker bundler in dev', () => {
    const result = rewriteEntryUrls(code, id, entry, '/project', 'dev')

    expect(result?.code).toContain('./service-worker.ts?sw=service_worker_file')
    expect(result?.code).toContain("'' + import.meta.url")
  })

  it('should route an explicit entry when the importer has a Vite cache query', () => {
    const result = rewriteEntryUrls(code, `${id}?v=abc123`, entry, '/project', 'dev')

    expect(result?.code).toContain('./service-worker.ts?sw=service_worker_file')
    expect(result?.code).toContain('/* @vite-ignore */')
  })

  it('should let Vite normalize an optimized workspace entry outside the project root', () => {
    const root = '/project/apps/host'
    const optimizedId = `${root}/node_modules/.vite/deps/vrowzer.js?v=abc123`
    const workspaceEntry = '/project/packages/vrowzer/dist/service-worker.ts'
    const optimizedCode = `const scriptURL = new URL('../../../../../packages/vrowzer/dist/service-worker.ts', import.meta.url)`
    const result = rewriteEntryUrls(
      optimizedCode,
      optimizedId,
      workspaceEntry,
      root,
      'dev',
      undefined,
      undefined,
      false,
      true
    )

    expect(result?.code).toContain(
      `new URL("../../../../../packages/vrowzer/dist/service-worker.ts?sw=service_worker_file", import.meta.url)`
    )
    expect(result?.code).not.toContain('@vite-ignore')
  })

  it('should preserve the optimized npm entry URL when the importer is outside the Vite root', () => {
    const root = '/project/host'
    const optimizedId = '/project/node_modules/.vite/deps/vrowzer.js?v=abc123'
    const npmEntry =
      '/project/node_modules/.pnpm/vrowzer@0.1.2/node_modules/vrowzer/dist/service-worker.ts'
    const optimizedCode = `const scriptURL = new URL('../../.pnpm/vrowzer@0.1.2/node_modules/vrowzer/dist/service-worker.ts', import.meta.url)`
    const result = rewriteEntryUrls(
      optimizedCode,
      optimizedId,
      npmEntry,
      root,
      'dev',
      undefined,
      undefined,
      false,
      true
    )

    expect(result?.code).toContain(
      `new URL(/* @vite-ignore */ "../../.pnpm/vrowzer@0.1.2/node_modules/vrowzer/dist/service-worker.ts?sw=service_worker_file", '' + import.meta.url)`
    )
  })

  it('should preserve placeholder rewriting in build mode', () => {
    const result = rewriteEntryUrls(code, id, entry, '/project', 'placeholder')

    expect(result?.code).toMatch(/__SW_ASSET__[a-z\d]+__/)
  })

  it('should preserve Rollup chunk emission', () => {
    const emitted: Array<{ type: 'chunk'; id: string; name: string }> = []
    const referenceIds = new Map<string, string>()
    const result = rewriteEntryUrls(
      code,
      id,
      entry,
      '/project',
      'rollup',
      file => {
        emitted.push(file)
        return 'service-worker-reference'
      },
      referenceIds
    )

    expect(result?.code).toContain('import.meta.ROLLUP_FILE_URL_service-worker-reference')
    expect(emitted).toEqual([{ type: 'chunk', id: entry, name: 'service-worker' }])
    expect(referenceIds.get(entry)).toBe('service-worker-reference')
  })

  it('should use the page location for an explicit entry in browser tests', () => {
    const result = rewriteEntryUrls(code, id, entry, '/project', 'dev', undefined, undefined, true)

    expect(result?.code).toContain('self.location.href')
  })

  it('should ignore a different Service Worker entry', () => {
    expect(
      rewriteEntryUrls(
        code,
        id,
        '/project/node_modules/vrowzer/dist/other-worker.ts',
        '/project',
        'dev'
      )
    ).toBeNull()
  })
})

describe('stripViteBase', () => {
  it('should remove a nested Vite base from a request pathname', () => {
    expect(stripViteBase('/app/@fs/project/service-worker.ts', '/app/')).toBe(
      '/@fs/project/service-worker.ts'
    )
  })

  it('should keep pathnames outside the configured base', () => {
    expect(stripViteBase('/application/service-worker.ts', '/app/')).toBe(
      '/application/service-worker.ts'
    )
  })

  it('should keep pathnames unchanged for the root base', () => {
    expect(stripViteBase('/@fs/project/service-worker.ts', '/')).toBe(
      '/@fs/project/service-worker.ts'
    )
  })
})

describe('sanitizeDefine', () => {
  it('should return undefined for undefined input', () => {
    expect(sanitizeDefine(undefined)).toBeUndefined()
  })

  it('should convert every supported define value to a string', () => {
    expect(
      sanitizeDefine({
        raw: 'false',
        number: 123,
        boolean: true,
        undefined,
        null: null,
        object: { nested: 'value' }
      })
    ).toEqual({
      raw: 'false',
      number: '123',
      boolean: 'true',
      undefined: 'undefined',
      null: 'null',
      object: '{"nested":"value"}'
    })
  })
})

describe('filterServiceWorkerPlugins', () => {
  it('should return undefined for undefined input', () => {
    expect(filterServiceWorkerPlugins(undefined)).toBeUndefined()
  })

  it('should return undefined for empty array', () => {
    expect(filterServiceWorkerPlugins([])).toBeUndefined()
  })

  it('should allow vite:asset (needed for ?raw support)', () => {
    const plugins = [{ name: 'vite:asset' }, { name: 'vite:import-analysis' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('vite:asset')
  })

  it('should allow vite:define', () => {
    const plugins = [{ name: 'vite:define' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('vite:define')
  })

  it('should allow vite:json and native:json', () => {
    const plugins = [{ name: 'vite:json' }, { name: 'native:json' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(2)
  })

  it('should allow vite:wasm-helper and wasm-fallback variants', () => {
    const plugins = [
      { name: 'vite:wasm-helper' },
      { name: 'vite:wasm-fallback' },
      { name: 'native:wasm-fallback' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(3)
  })

  it('should filter out Vite internal plugins not in allowlist', () => {
    const plugins = [
      { name: 'vite:build-html' },
      { name: 'vite:css' },
      { name: 'vite:css-post' },
      { name: 'vite:manifest' },
      { name: 'vite:ssr-manifest' },
      { name: 'vite:reporter' },
      { name: 'vite:load-fallback' },
      { name: 'vite:import-analysis' },
      { name: 'vite:build-import-analysis' },
      { name: 'vite:client-inject' },
      { name: 'vite:worker' },
      { name: 'vite:resolve' },
      { name: 'vite:asset' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('vite:asset')
  })

  it('should filter out unplugin-service-worker (prevent recursion)', () => {
    const plugins = [{ name: 'unplugin-service-worker' }, { name: 'my-plugin' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('my-plugin')
  })

  it('should keep plugins without a name', () => {
    const plugins = [{ resolveId: () => null }, { name: 'vite:build-html' }]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(1)
  })

  it('should filter out null and non-object entries', () => {
    const plugins = [null, undefined, 'string-plugin', 42, { name: 'valid-plugin' }]

    const result = filterServiceWorkerPlugins(plugins as unknown[])!
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('valid-plugin')
  })

  it('should keep user plugins and third-party plugins', () => {
    const plugins = [
      { name: 'my-custom-plugin' },
      { name: '@some/plugin' },
      { name: 'rolldown-plugin-foo' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(3)
  })

  it('should filter out native: prefixed plugins not in allowlist', () => {
    const plugins = [
      { name: 'native:alias' },
      { name: 'native:json' },
      { name: 'native:wasm-fallback' }
    ]

    const result = filterServiceWorkerPlugins(plugins)!
    expect(result).toHaveLength(2)
    expect(result.map(p => p.name)).toContain('native:json')
    expect(result.map(p => p.name)).toContain('native:wasm-fallback')
  })
})

describe('resolveServiceWorkerPlugins', () => {
  const pluginA: Plugin = { name: 'plugin-a' }
  const pluginB: Plugin = { name: 'plugin-b' }
  const pluginC: Plugin = { name: 'plugin-c' }

  it('should return empty array when both inputs are undefined', () => {
    const result = resolveServiceWorkerPlugins(undefined, undefined)
    expect(result).toEqual([])
  })

  it('should return user plugins when bundler plugins are undefined', () => {
    const result = resolveServiceWorkerPlugins([pluginA, pluginB], undefined)
    expect(result).toEqual([pluginA, pluginB])
  })

  it('should return bundler plugins when user plugins are undefined', () => {
    const result = resolveServiceWorkerPlugins(undefined, [pluginB, pluginC])
    expect(result).toEqual([pluginB, pluginC])
  })

  it('should merge user plugins before bundler plugins', () => {
    const result = resolveServiceWorkerPlugins([pluginA], [pluginB, pluginC])
    expect(result).toEqual([pluginA, pluginB, pluginC])
  })

  it('should place user plugins first (higher priority)', () => {
    const userPlugin: Plugin = { name: 'user-override' }
    const bundlerPlugin: Plugin = { name: 'bundler-default' }

    const result = resolveServiceWorkerPlugins([userPlugin], [bundlerPlugin])
    expect(result[0]).toBe(userPlugin)
    expect(result[1]).toBe(bundlerPlugin)
  })
})
