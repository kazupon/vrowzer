import { describe, expect, it, vi } from 'vite-plus/test'
import type { PluginContext } from 'rolldown'
import type { PackageCache, PackageData } from '../packages'

vi.mock('../external', () => ({
  canExternalizeFile: vi.fn<() => boolean>(() => false),
  shouldExternalize: vi.fn<() => boolean>(() => false),
}))

vi.mock('../optimizer', () => ({
  isDepOptimizationDisabled: vi.fn<() => boolean>(() => true),
  optimizedDepInfoFromFile: vi.fn<() => undefined>(),
  optimizedDepInfoFromId: vi.fn<() => undefined>(),
}))

import { resolvePlugin } from './resolve'

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
