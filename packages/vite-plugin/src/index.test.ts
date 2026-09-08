import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

type ServiceWorkerPluginFactory = (options: unknown) => { name: string }

const serviceWorkerPluginFactory = vi.hoisted(() =>
  vi.fn<ServiceWorkerPluginFactory>(_options => ({ name: 'unplugin-service-worker' }))
)

vi.mock('@vrowzer/unplugin-service-worker/vite', () => ({
  default: serviceWorkerPluginFactory
}))

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, readFileSync: vi.fn<typeof actual.readFileSync>(actual.readFileSync) }
})
vi.mock('./extract.ts', { spy: true })
vi.mock('./prebundle.ts', () => ({
  cleanOutputDir: vi.fn<typeof cleanOutputDir>(),
  prebundleWorkerConfig: vi.fn<typeof prebundleWorkerConfig>()
}))

import { Vrowzer } from './index.ts'
import { extractWorkerConfig } from './extract.ts'
import { cleanOutputDir, prebundleWorkerConfig } from './prebundle.ts'

import type { Plugin, ResolvedConfig, UserConfig } from 'vite'

function resolveVrowzerConfig(options: Parameters<typeof Vrowzer>[0] = {}): UserConfig {
  const plugin = Vrowzer(options).find(plugin => plugin.name === 'vrowzer:config')
  if (!plugin || typeof plugin.config !== 'function') {
    throw new Error('vrowzer:config plugin is missing its config hook')
  }

  return (plugin.config as () => UserConfig)()
}

describe('Vrowzer', () => {
  beforeEach(() => {
    serviceWorkerPluginFactory.mockClear()
  })

  test('returns array of 7 plugins with auto mode (default)', () => {
    const plugins = Vrowzer()
    expect(plugins).toHaveLength(7)
  })

  test('returns array of 6 plugins with auto: false', () => {
    const plugins = Vrowzer({ auto: false })
    expect(plugins).toHaveLength(6)
  })

  test('includes vrowzer:auto-manifest plugin when auto: true', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:auto-manifest')).toBe(true)
  })

  test('excludes vrowzer:auto-manifest plugin when auto: false', () => {
    const plugins = Vrowzer({ auto: false })
    expect(plugins.some((p: any) => p.name === 'vrowzer:auto-manifest')).toBe(false)
  })

  test('includes vrowzer:config plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:config')).toBe(true)
  })

  test.each([
    ['auto mode', {}],
    ['manual mode', { auto: false }]
  ] as const)('excludes vite-dev-server from host dependency optimization in %s', (_, options) => {
    const config = resolveVrowzerConfig(options)

    expect(config.optimizeDeps?.exclude).toEqual(['@vrowzer/vite-dev-server'])
  })

  test('includes vrowzer:server-middleware plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:server-middleware')).toBe(true)
  })

  test('includes vrowzer:env plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:env')).toBe(true)
  })

  test('includes vrowzer:rolldown plugin', () => {
    const plugins = Vrowzer()
    expect(plugins.some((p: any) => p.name === 'vrowzer:rolldown')).toBe(true)
  })

  test('includes the Rolldown asset plugin in worker builds', async () => {
    const config = resolveVrowzerConfig()
    const workerPlugins = await config.worker?.plugins?.()

    expect(workerPlugins).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'vrowzer:worker-rolldown-assets' })])
    )
  })

  test('includes service-worker plugin', () => {
    const plugins = Vrowzer()
    // unplugin-service-worker generates a plugin with 'unplugin-service-worker' in the name
    expect(plugins.some((p: any) => p.name?.includes('service-worker'))).toBe(true)
  })

  test('uses the default scope for the service-worker response header', () => {
    Vrowzer()

    expect(serviceWorkerPluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: expect.any(String),
        serviceWorkerAllowed: '/',
        format: 'esm'
      })
    )
  })

  test('uses a custom scope for the service-worker response header', () => {
    Vrowzer({ serviceWorkerScope: '/app/' })

    expect(serviceWorkerPluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({ serviceWorkerAllowed: '/app/' })
    )
  })

  test('forwards a custom service worker entry', () => {
    Vrowzer({ serviceWorkerEntry: '/custom/service-worker.ts' })

    expect(serviceWorkerPluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({ entry: '/custom/service-worker.ts', format: 'esm' })
    )
  })
})

describe('Worker config extraction', () => {
  const bundledPath = '/host/node_modules/.vrowzer/config.bundled.mjs'
  const hostSource = `
import react from '@vitejs/plugin-react'
import { Vrowzer } from '@vrowzer/vite-plugin'
export default {
  plugins: [react(), Vrowzer({ auto: false, extract: false })],
  define: { __HOST__: 'true' },
  html: { cspNonce: 'host-nonce' },
  input: '/host.html',
  environments: { client: { input: '/host-client.html' } }
}
`
  const forwardConsole = { enabled: false, unhandledErrors: false, logLevels: [] }

  function createPlugin(options: Parameters<typeof Vrowzer>[0] = {}): Plugin {
    return Vrowzer(options).find(plugin => plugin.name === 'vrowzer:config')!
  }

  async function configure(
    plugin: Plugin,
    overrides: Partial<Pick<ResolvedConfig, 'root' | 'command'>> & {
      configFile?: string | false | undefined
      server?: UserConfig['server']
      build?: UserConfig['build']
      configFileDependencies?: string[]
      logger?: Pick<ResolvedConfig['logger'], 'warn'>
    } = {}
  ): Promise<void> {
    const config = {
      root: '/host',
      command: 'serve',
      configFile: '/host/vite.config.ts',
      server: {},
      build: {},
      configFileDependencies: [],
      inlineConfig: {},
      logger: { warn: vi.fn() },
      ...overrides
    } as ResolvedConfig
    await (plugin.configResolved as (config: ResolvedConfig) => Promise<void>)(config)
  }

  async function generatedConfig(): Promise<UserConfig> {
    const source = vi.mocked(prebundleWorkerConfig).mock.calls.at(-1)![0].workerSource!
    const module = await import(
      /* @vite-ignore */ `data:text/javascript,${encodeURIComponent(source)}`
    )
    return module.default
  }

  beforeEach(() => {
    vi.mocked(readFileSync).mockReset().mockReturnValue(hostSource)
    vi.mocked(extractWorkerConfig).mockClear()
    vi.mocked(cleanOutputDir).mockClear()
    vi.mocked(prebundleWorkerConfig)
      .mockReset()
      .mockResolvedValue({ path: bundledPath, dependencies: [] })
  })

  test.each([true, false])('skips host file reads and extraction with auto=%s', async auto => {
    await configure(createPlugin({ auto, extract: false }))

    expect(readFileSync).not.toHaveBeenCalled()
    expect(extractWorkerConfig).not.toHaveBeenCalled()
    expect(cleanOutputDir).not.toHaveBeenCalled()
    expect(prebundleWorkerConfig).toHaveBeenCalledWith({
      workerSource: expect.any(String),
      root: '/host',
      configDir: '/host'
    })
    expect(await generatedConfig()).toEqual({ plugins: [] })
  })

  test('does not parse callback or nested host plugins when extraction is disabled', async () => {
    vi.mocked(readFileSync).mockReturnValue(`
export default defineConfig(({ mode }) => ({
  plugins: [[mode === 'development' ? react() : null], Vrowzer({ extract: false })]
}))
`)
    await configure(createPlugin({ extract: false }))

    expect(readFileSync).not.toHaveBeenCalled()
    expect(extractWorkerConfig).not.toHaveBeenCalled()
    expect(await generatedConfig()).toEqual({ plugins: [] })
  })

  test.each([
    { origin: 'https://assets.example.test' },
    { forwardConsole },
    { origin: 'https://assets.example.test/"quoted"\\path', forwardConsole },
    {}
  ])('does not forward resolved server settings with extraction disabled: %j', async server => {
    await configure(createPlugin({ extract: false }), {
      server: {
        ...server,
        port: 4173,
        proxy: { '/api': 'http://localhost:3000' },
        fs: { strict: true }
      }
    })

    expect(await generatedConfig()).toEqual({ plugins: [] })
  })

  test.each([false, undefined] as const)(
    'prebundles without a config file (%s)',
    async configFile => {
      await configure(createPlugin({ extract: false }), { configFile, root: '/inline-root' })

      expect(readFileSync).not.toHaveBeenCalled()
      expect(extractWorkerConfig).not.toHaveBeenCalled()
      expect(prebundleWorkerConfig).toHaveBeenCalledWith({
        workerSource: expect.any(String),
        root: '/inline-root',
        configDir: '/inline-root'
      })
      expect(await generatedConfig()).toEqual({ plugins: [] })
    }
  )

  test.each(['serve', 'build'] as const)(
    'injects the empty config and aliases in %s',
    async command => {
      const resolve = { alias: [{ find: 'preview-lib', replacement: '/vendor/preview-lib.js' }] }
      const plugin = createPlugin({ extract: false, resolve })
      await configure(plugin, { command, configFile: false })

      const config = (plugin.config as () => UserConfig)()
      const workerPlugins = (await config.worker!.plugins!()) as Plugin[]
      const workerPlugin = workerPlugins.find(
        plugin => plugin.name === 'vrowzer:web-worker-config-inject'
      )!

      for (const entryPlugin of [plugin, workerPlugin]) {
        const result = (entryPlugin.transform as (code: string, id: string) => { code: string })(
          'initWebWorker()',
          '/vrowzer/web-worker.ts?worker_file&type=module'
        )
        expect(result.code).toContain(`import config from ${JSON.stringify(bundledPath)}`)
        expect(result.code).toContain(JSON.stringify(resolve))
        expect(result.code).toContain('Object.assign(resolved, { resolve: workerResolve })')
        expect(result.code).toContain('initWebWorker(resolved)')
      }
    }
  )

  test.each([{}, { extract: true }])('preserves extraction with %j', async options => {
    await configure(createPlugin({ auto: false, ...options }), {
      configFile: '/host/config/vite.config.ts',
      server: { origin: 'https://assets.example.test', forwardConsole }
    })

    expect(readFileSync).toHaveBeenCalledWith('/host/config/vite.config.ts', 'utf-8')
    expect(extractWorkerConfig).toHaveBeenCalledWith(hostSource, '/host/config/vite.config.ts', {
      serverOrigin: 'https://assets.example.test',
      serverForwardConsole: forwardConsole
    })
    const prebundleOptions = vi.mocked(prebundleWorkerConfig).mock.calls[0]![0]
    expect(prebundleOptions.configDir).toBe('/host/config')
    expect(prebundleOptions.workerSource).toContain("from '@vitejs/plugin-react'")
    expect(prebundleOptions.workerSource).toContain('react()')
    expect(prebundleOptions.workerSource).not.toContain('Vrowzer')
    expect(prebundleOptions.workerSource).toContain('define:')
    expect(prebundleOptions.workerSource).toContain('html:')
    expect(prebundleOptions.workerSource).toContain('environments:')
  })

  test('preserves the early fallback without adding server settings', async () => {
    vi.mocked(readFileSync).mockReturnValue('export default () => ({ plugins: [] })')
    await configure(createPlugin(), {
      server: { origin: 'https://assets.example.test', forwardConsole }
    })

    expect(extractWorkerConfig).toHaveReturnedWith({
      code: 'export default { plugins: [] }',
      unsupported: ['config is not an object expression']
    })
    expect(await generatedConfig()).toEqual({ plugins: [] })
  })

  test('keeps skipping config generation without a file in default mode', async () => {
    await configure(createPlugin(), { configFile: false })

    expect(readFileSync).not.toHaveBeenCalled()
    expect(extractWorkerConfig).not.toHaveBeenCalled()
    expect(cleanOutputDir).not.toHaveBeenCalled()
    expect(prebundleWorkerConfig).not.toHaveBeenCalled()
  })

  test('propagates prebundle failures when extraction is disabled', async () => {
    const error = new Error('prebundle failed')
    vi.mocked(prebundleWorkerConfig).mockRejectedValueOnce(error)

    await expect(configure(createPlugin({ extract: false }))).rejects.toBe(error)
  })

  test.each([
    ['/host/config/vite.config.ts', './preview/worker.ts', '/host/config/preview/worker.ts'],
    [false, './worker.ts', '/host/worker.ts'],
    [undefined, '/outside/worker.ts', '/outside/worker.ts']
  ] as const)(
    'uses a dedicated file relative to %s',
    async (configFile, workerConfig, expected) => {
      const dependencies: string[] = []
      vi.mocked(prebundleWorkerConfig).mockResolvedValue({
        path: bundledPath,
        dependencies: [expected]
      })
      await configure(createPlugin({ workerConfig }), {
        configFile,
        configFileDependencies: dependencies
      })
      expect(readFileSync).not.toHaveBeenCalled()
      expect(extractWorkerConfig).not.toHaveBeenCalled()
      expect(prebundleWorkerConfig).toHaveBeenCalledWith({
        workerConfig: expected,
        root: '/host',
        configDir: configFile ? '/host/config' : '/host',
        onDependency: expect.any(Function)
      })
      expect(dependencies).toEqual([])
    }
  )

  test.each(['serve', 'build'] as const)(
    'warns about legacy resolve once during %s configuration',
    async command => {
      const warn = vi.fn()
      const plugin = createPlugin({ workerConfig: './worker.ts', resolve: {} })
      await configure(plugin, { command, logger: { warn } })
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('replaces the entire Worker resolve')
      )
      const transform = plugin.transform as (code: string, id: string) => unknown
      transform('initWebWorker()', '/web-worker.ts')
      transform('initWebWorker()', '/web-worker.ts')
      expect(warn).toHaveBeenCalledTimes(1)
    }
  )

  test.each([{ workerConfig: './worker.ts' }, { resolve: {} }])(
    'does not warn unnecessarily: %j',
    async options => {
      const warn = vi.fn()
      await configure(createPlugin(options), { logger: { warn } })
      expect(warn).not.toHaveBeenCalled()
    }
  )

  test('rejects build watch with workerConfig', async () => {
    await expect(
      configure(createPlugin({ workerConfig: './worker.ts' }), {
        command: 'build',
        build: { watch: {} }
      })
    ).rejects.toThrow('does not support build watch')
    expect(prebundleWorkerConfig).not.toHaveBeenCalled()
  })

  test('cleans the configured root after a successful build, not the working directory', async () => {
    const plugin = createPlugin({ extract: false })
    await configure(plugin, { root: '/another-root', command: 'build' })
    expect(cleanOutputDir).not.toHaveBeenCalled()
    await (plugin.closeBundle as () => void)()
    expect(cleanOutputDir).toHaveBeenCalledWith('/another-root')
  })
})
