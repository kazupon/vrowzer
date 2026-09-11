import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PluginContext } from 'rolldown'
import type { PackageCache, PackageData } from '../packages'
import type { InternalResolveOptions } from './resolve'
import { DEFAULT_CLIENT_CONDITIONS, DEFAULT_CLIENT_MAIN_FIELDS, DEFAULT_EXTENSIONS } from '../constants'
import { normalizePath } from '../utils'

vi.mock('../external', () => ({
  canExternalizeFile: vi.fn<() => boolean>(() => false),
  shouldExternalize: vi.fn<() => boolean>(() => false),
}))

vi.mock('../optimizer', () => ({
  isDepOptimizationDisabled: vi.fn<() => boolean>(() => true),
  optimizedDepInfoFromFile: vi.fn<() => undefined>(),
  optimizedDepInfoFromId: vi.fn<() => undefined>(),
}))

import { optionalPeerDepId, resolvePlugin, tryNodeResolve } from './resolve'

function createPackageData(): PackageData {
  return {
    dir: '/project',
    data: {
      name: 'fixture',
    } as PackageData['data'],
    hasSideEffects: () => false,
    setResolvedCache: () => {},
    getResolvedCache: () => undefined,
  }
}

describe('resolvePlugin package imports', () => {
  it.each(['#/imported', '#/imported?raw'])(
    'falls through when %s has no package imports map',
    async (id) => {
      const packageCache: PackageCache = new Map([
        ['fnpd_/project/src', createPackageData()],
      ])
      const plugin = resolvePlugin({
        root: '/project',
        isBuild: false,
        isProduction: false,
        asSrc: true,
        packageCache,
      })
      const resolveId = plugin.resolveId as {
        handler: (
          this: PluginContext,
          id: string,
          importer: string | undefined,
          options: Record<string, unknown>,
        ) => unknown
      }
      const context = {
        environment: {
          mode: 'dev',
          name: 'client',
          config: {
            consumer: 'client',
            resolve: {
              conditions: ['browser'],
              externalConditions: [],
            },
          },
        },
      } as unknown as PluginContext

      const result = await resolveId.handler.call(
        context,
        id,
        '/project/src/entry.ts',
        {
          kind: 'import-statement',
          isEntry: false,
          custom: {
            'vite:import-glob': {
              isSubImportsPattern: true,
            },
          },
        },
      )

      expect(result).toBeUndefined()
    },
  )
})

describe('tryNodeResolve optional peer dependencies', () => {
  let root: string
  let options: InternalResolveOptions

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vrowzer-optional-peer-')))
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'project' }))
    options = {
      root,
      isBuild: false,
      isProduction: false,
      packageCache: new Map(),
      mainFields: [...DEFAULT_CLIENT_MAIN_FIELDS],
      conditions: [...DEFAULT_CLIENT_CONDITIONS],
      externalConditions: [],
      extensions: DEFAULT_EXTENSIONS,
      dedupe: [],
      builtins: [],
      external: [],
      noExternal: [],
      preserveSymlinks: false,
      tsconfigPaths: false,
    }
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  function createImporter(name: string, nestedData: Record<string, unknown> = {}): string {
    const packageDir = path.join(root, 'node_modules', name)
    const nestedDir = path.join(packageDir, 'dist/esm')
    fs.mkdirSync(nestedDir, { recursive: true })
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      peerDependencies: { 'optional-peer': '*', '@scope/optional-peer': '*', 'required-peer': '*' },
      peerDependenciesMeta: {
        'optional-peer': { optional: true },
        '@scope/optional-peer': { optional: true },
      },
    }))
    fs.writeFileSync(path.join(nestedDir, 'package.json'), JSON.stringify({
      name: `${name}-esm`,
      type: 'module',
      ...nestedData,
    }))
    const importer = path.join(nestedDir, 'index.js')
    fs.writeFileSync(importer, '')
    return importer
  }

  it.each([
    ['dep', 'optional-peer'],
    ['@scope/dep', '@scope/optional-peer/subpath'],
  ])('uses %s root metadata for %s', (name, id) => {
    const importer = createImporter(name)

    expect(tryNodeResolve(id, importer, options)).toEqual({
      id: `${optionalPeerDepId}:${id}:${name}`,
    })
  })

  it('does not use optional peer metadata from a nested manifest', () => {
    const importer = createImporter('dep', {
      peerDependencies: { 'nested-only-peer': '*' },
      peerDependenciesMeta: { 'nested-only-peer': { optional: true } },
    })

    expect(tryNodeResolve('nested-only-peer', importer, options)).toBeUndefined()
  })

  it('does not treat a required peer as optional', () => {
    const importer = createImporter('dep')

    expect(tryNodeResolve('required-peer', importer, options)).toBeUndefined()
  })

  it('preserves the option to disable optional peer handling', () => {
    const importer = createImporter('dep')

    expect(tryNodeResolve('optional-peer', importer, {
      ...options,
      disableOptionalPeerDepHandling: true,
    })).toBeUndefined()
  })

  it('resolves an installed optional peer to its file', () => {
    const importer = createImporter('dep')
    const peerDir = path.join(root, 'node_modules/optional-peer')
    fs.mkdirSync(peerDir, { recursive: true })
    fs.writeFileSync(path.join(peerDir, 'package.json'), JSON.stringify({
      name: 'optional-peer',
      main: 'index.js',
    }))
    const entry = path.join(peerDir, 'index.js')
    fs.writeFileSync(entry, 'export const value = 1')

    expect(tryNodeResolve('optional-peer', importer, options)?.id).toBe(normalizePath(entry))
  })
})
