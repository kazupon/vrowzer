import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import type { InlineConfig, ResolvedConfig } from './config'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteJsonPlugin: vi.fn<() => { name: string }>(() => ({
    name: 'vite:json',
  })),
  viteTransformPlugin: vi.fn<() => { name: string }>(() => ({
    name: 'native:transform',
  })),
}))

vi.mock('@vrowzer/rolldown/parseAst', () => ({
  parseAst: vi.fn<(...args: unknown[]) => unknown>(),
  parseAstAsync: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

import { UnknownEnvironment } from './baseEnvironment'
import { resolveConfig } from './config'
import { createBackCompatIdResolver, createIdResolver } from './idResolver'
import { normalizePath } from './utils'

beforeAll(() => {
  vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// Same options as the CSS `@import` resolver in `plugins/css.ts`
const cssResolveOptions = {
  extensions: ['.css'],
  mainFields: ['style'],
  conditions: ['style'],
  tryIndex: false,
  preferRelative: true,
}

describe('createIdResolver', () => {
  let root: string
  let config: ResolvedConfig

  function writeFile(file: string, content: string) {
    const filePath = path.join(root, file)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content)
  }

  function fixture(file: string) {
    return normalizePath(path.join(root, file))
  }

  beforeEach(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vrowzer-id-resolver-')))
    writeFile('package.json', JSON.stringify({ name: 'project' }))
    writeFile('src/a.css', `@import './b.css';`)
    writeFile('src/b.css', '.b {}')
    writeFile('node_modules/pkg/package.json', JSON.stringify({ name: 'pkg', version: '1.0.0' }))
    writeFile('node_modules/pkg/style.css', '.pkg {}')
    config = await resolveConfig(
      {
        configFile: false,
        logLevel: 'silent',
        root,
        resolve: {
          alias: [{ find: /^@\//, replacement: `${fixture('src')}/` }],
        },
      },
      'serve',
    )
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('resolves a relative file with the JavaScript resolver', async () => {
    const resolve = createIdResolver(config, cssResolveOptions)
    const environment = new UnknownEnvironment('client', config)

    await expect(resolve(environment, './b.css', fixture('src/a.css'))).resolves.toBe(fixture('src/b.css'))
  })

  test('resolves a package file with the JavaScript resolver', async () => {
    const resolve = createIdResolver(config, cssResolveOptions)
    const environment = new UnknownEnvironment('client', config)

    await expect(resolve(environment, 'pkg/style.css', fixture('src/a.css'))).resolves.toBe(
      fixture('node_modules/pkg/style.css'),
    )
  })

  test('resolves an aliased file after applying the alias', async () => {
    const resolve = createIdResolver(config, cssResolveOptions)
    const environment = new UnknownEnvironment('client', config)

    await expect(resolve(environment, '@/b.css', fixture('src/a.css'))).resolves.toBe(fixture('src/b.css'))
    await expect(resolve(environment, '@/b.css', fixture('src/a.css'), true)).resolves.toBe(
      `${fixture('src')}/b.css`,
    )
  })

  test('returns undefined for a missing file', async () => {
    const resolve = createIdResolver(config, cssResolveOptions)
    const environment = new UnknownEnvironment('client', config)

    await expect(resolve(environment, './missing.css', fixture('src/a.css'))).resolves.toBeUndefined()
  })

  test.each([true, 'v2'])(
    'keeps the JavaScript resolver when removed experimental.enableNativePlugin is %j',
    async (enableNativePlugin) => {
      const leftoverConfig = await resolveConfig(
        {
          configFile: false,
          logLevel: 'silent',
          root,
          experimental: { enableNativePlugin } as InlineConfig['experimental'],
        },
        'serve',
      )
      const resolve = createIdResolver(leftoverConfig, cssResolveOptions)
      const environment = new UnknownEnvironment('client', leftoverConfig)

      await expect(resolve(environment, './b.css', fixture('src/a.css'))).resolves.toBe(fixture('src/b.css'))
    },
  )

  test('resolves through the back-compat resolver used by CSS', async () => {
    const resolve = createBackCompatIdResolver(config, cssResolveOptions)
    const environment = new UnknownEnvironment('client', config)

    await expect(resolve(environment, './b.css', fixture('src/a.css'))).resolves.toBe(fixture('src/b.css'))
  })
})
