import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteTransformPlugin: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/parseAst', async () => import('rolldown/parseAst'))
vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

const mocks = vi.hoisted(() => ({
  isServerAccessDeniedForTransform:
    vi.fn<(config: unknown, id: string) => boolean>(),
  isFileLoadingAllowed: vi.fn<(config: unknown, file: string) => boolean>(),
  readFile: vi.fn<(file: string, encoding: string) => Promise<string>>(),
}))

vi.mock('./transformAccess', () => ({
  isServerAccessDeniedForTransform: mocks.isServerAccessDeniedForTransform,
}))
vi.mock('./middlewares/static', () => ({
  isFileLoadingAllowed: mocks.isFileLoadingAllowed,
}))
vi.mock('node:fs/promises', () => ({
  default: { readFile: mocks.readFile },
}))

import type { DevEnvironment } from './environment'
import { ERR_DENIED_ID, transformRequest } from './transformRequest'

const loaded = new Error('loaded')
const read = new Error('read')

function createEnvironment(load: () => Promise<unknown>) {
  const config = { root: '/project', dev: { recoverable: false } }
  const pluginLoad = vi.fn<(id: string) => Promise<unknown>>(load)
  const environment = {
    _closing: false,
    _pendingRequests: new Map(),
    config,
    logger: { warnOnce: vi.fn<() => void>() },
    moduleGraph: {
      getModuleByUrl: async () => undefined,
      getModuleById: () => undefined,
    },
    pluginContainer: {
      resolveId: async (url: string) => ({ id: url }),
      load: pluginLoad,
    },
    getTopLevelConfig: () => config,
  } as unknown as DevEnvironment
  return { environment, config, pluginLoad }
}

describe('transformRequest server.fs checks', () => {
  beforeEach(() => {
    mocks.isServerAccessDeniedForTransform.mockReset().mockReturnValue(false)
    mocks.isFileLoadingAllowed.mockReset().mockReturnValue(false)
    mocks.readFile.mockReset().mockRejectedValue(read)
  })

  it('denies ids outside server.fs by default', async () => {
    mocks.isServerAccessDeniedForTransform.mockReturnValue(true)
    const { environment, config, pluginLoad } = createEnvironment(
      async () => {
        throw loaded
      },
    )

    await expect(
      transformRequest(environment, '/secret.txt?raw', { skipFsCheck: false }),
    ).rejects.toMatchObject({ code: ERR_DENIED_ID, id: '/secret.txt?raw' })
    expect(mocks.isServerAccessDeniedForTransform).toHaveBeenCalledWith(
      config,
      '/secret.txt?raw',
    )
    expect(pluginLoad).not.toHaveBeenCalled()
  })

  it('does not check virtual ids', async () => {
    mocks.isServerAccessDeniedForTransform.mockReturnValue(true)
    const { environment } = createEnvironment(async () => {
      throw loaded
    })

    await expect(
      transformRequest(environment, '\0virtual:secret?raw', {
        skipFsCheck: false,
      }),
    ).rejects.toBe(loaded)
    expect(mocks.isServerAccessDeniedForTransform).not.toHaveBeenCalled()
  })

  it('skips the check for transports that opt out', async () => {
    mocks.isServerAccessDeniedForTransform.mockReturnValue(true)
    const { environment } = createEnvironment(async () => {
      throw loaded
    })

    await expect(
      transformRequest(environment, '/secret.txt?raw', { skipFsCheck: true }),
    ).rejects.toBe(loaded)
    expect(mocks.isServerAccessDeniedForTransform).not.toHaveBeenCalled()
  })

  it('falls back to reading the file only when allowed or skipped', async () => {
    const { environment } = createEnvironment(async () => null)

    await expect(
      transformRequest(environment, '/outside.js', { skipFsCheck: true }),
    ).rejects.toBe(read)
    expect(mocks.readFile).toHaveBeenCalledWith('/outside.js', 'utf-8')

    mocks.readFile.mockClear()
    await transformRequest(environment, '/outside.js', {
      skipFsCheck: false,
    }).catch(() => undefined)
    expect(mocks.isFileLoadingAllowed).toHaveBeenCalled()
    expect(mocks.readFile).not.toHaveBeenCalled()
  })
})
