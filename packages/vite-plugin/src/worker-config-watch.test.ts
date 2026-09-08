import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { setImmediate, setTimeout as delay } from 'node:timers/promises'
import { createLogger, createServer } from 'vite'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { Vrowzer } from './index.ts'
import { resolveOutputDir } from './prebundle.ts'

import type { ViteDevServer } from 'vite'

const directories: string[] = []
const servers: ViteDevServer[] = []

async function start(options: { helper?: 'local' | 'outside' | 'workspace'; watch?: null } = {}) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'vrowzer-config-watch-')))
  directories.push(directory)
  const root = join(directory, 'host')
  const write = (file: string, source: string) => {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, source)
  }
  const helper =
    !options.helper || options.helper === 'local' ? './helper.ts' : '../shared/helper.ts'
  const reference = options.helper === 'workspace' ? 'worker-helper' : helper
  write('worker.ts', `import { value } from '${reference}'; export default { define: { value } }`)
  write(helper, `export const value = 'first'`)
  if (options.helper === 'workspace') {
    write(
      '../shared/package.json',
      JSON.stringify({ name: 'worker-helper', type: 'module', exports: './helper.ts' })
    )
    mkdirSync(join(root, 'node_modules'))
    symlinkSync(join(directory, 'shared'), join(root, 'node_modules/worker-helper'), 'dir')
  }
  const logger = createLogger('silent')
  const errors = vi.spyOn(logger, 'error')
  let watching: Promise<void> | undefined
  const server = await createServer({
    root,
    configFile: false,
    customLogger: logger,
    server: {
      port: 0,
      host: '127.0.0.1',
      // Exercise the Linux watcher backend on macOS as well.
      watch: options.watch === null ? null : { useFsEvents: false, usePolling: false }
    },
    plugins: [
      ...Vrowzer({ auto: false, workerConfig: './worker.ts' }).filter(
        plugin => plugin.name === 'vrowzer:config'
      ),
      {
        name: 'test:watch-ready',
        configureServer(server) {
          if (server.config.server.watch !== null) {
            watching = new Promise(resolve => server.watcher.once('ready', resolve))
          }
        }
      }
    ]
  })
  servers.push(server)
  await server.listen()
  await watching
  if (options.watch !== null) {
    const path = join(root, helper)
    await vi.waitFor(() =>
      expect(server.watcher.getWatched()[dirname(path)]).toContain(basename(path))
    )
  }
  return {
    root,
    helper,
    server,
    write,
    errors,
    bundle: () => readFileSync(join(resolveOutputDir(root), 'config.bundled.mjs'), 'utf8')
  }
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await server.close()
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
  vi.restoreAllMocks()
})

describe('worker config dev watch', () => {
  test.each(['local', 'outside', 'workspace'] as const)(
    'restarts the host after a %s helper changes',
    async placement => {
      const { root, server, helper, write, bundle } = await start({ helper: placement })
      expect(
        Object.keys(server.watcher.getWatched()).some(path =>
          path.startsWith(join(root, 'node_modules'))
        )
      ).toBe(false)
      const previousConfig = server.config
      write(helper, `export const value = 'second'`)
      await vi.waitFor(
        () => {
          expect(server.config).not.toBe(previousConfig)
          expect(bundle()).toContain('second')
        },
        { timeout: 3000 }
      )
    }
  )

  test('honors a disabled host watcher while allowing manual restarts', async () => {
    const { server, write, bundle } = await start({ watch: null })
    expect(server.watcher.getWatched()).toEqual({})
    const previousConfig = server.config
    write('helper.ts', `export const value = 'manual restart'`)
    await server.restart()
    expect(server.config).not.toBe(previousConfig)
    expect(bundle()).toContain('manual restart')
    expect(server.watcher.getWatched()).toEqual({})
  })

  test.each([false, true])(
    'waits for initial requests before restarting, with close=%s',
    async close => {
      const { server, write, bundle } = await start()
      let finishRequests!: () => void
      const pendingRequests = new Promise<void>(resolve => {
        finishRequests = resolve
      })
      const idle = vi.spyOn(server, 'waitForRequestsIdle').mockReturnValue(pendingRequests)
      const restart = vi.spyOn(server, 'restart')
      try {
        write('helper.ts', `export const value = 'after requests'`)
        await vi.waitFor(() => expect(idle).toHaveBeenCalled())
        expect(restart).not.toHaveBeenCalled()
        expect(bundle()).toContain('first')
        if (close) {
          await server.close()
        }
      } finally {
        finishRequests()
      }
      await setImmediate()
      await vi.waitFor(
        () => {
          expect(restart).toHaveBeenCalledTimes(close ? 0 : 1)
          expect(bundle()).toContain(close ? 'first' : 'after requests')
        },
        { timeout: 3000 }
      )
    }
  )

  test('does not dispose host watchers when a dependency scan closes', async () => {
    const { server, write, bundle } = await start()
    const plugin = server.config.plugins.find(plugin => plugin.name === 'vrowzer:config')!
    await (plugin.closeBundle as (this: unknown) => void).call({
      environment: { mode: 'scan', getTopLevelConfig: () => server.config }
    })
    write('helper.ts', `export const value = 'after scan'`)
    await vi.waitFor(() => expect(bundle()).toContain('after scan'), { timeout: 3000 })
  })

  test('watches new valid imports and keeps listener counts stable across consecutive saves', async () => {
    const { root, server, write, bundle } = await start()
    const listenerCounts = () =>
      ['add', 'change', 'unlink'].map(event => server.watcher.listenerCount(event))
    const initialListeners = listenerCounts()
    write('new-helper.ts', `export const value = 'new dependency'`)
    write(
      'worker.ts',
      `import { value } from './new-helper.ts'; export default { define: { value } }`
    )
    await vi.waitFor(() => expect(bundle()).toContain('new dependency'), { timeout: 3000 })
    await vi.waitFor(() => expect(server.watcher.getWatched()[root]).toContain('new-helper.ts'))

    for (const value of ['second', 'third', 'last']) {
      const previousConfig = server.config
      write('new-helper.ts', `export const value = 'intermediate'`)
      write('new-helper.ts', `export const value = '${value}'`)
      await vi.waitFor(
        () => {
          expect(server.config).not.toBe(previousConfig)
          expect(bundle()).toContain(value)
        },
        { timeout: 3000 }
      )
      await vi.waitFor(() => expect(server.watcher.getWatched()[root]).toContain('new-helper.ts'))
      expect(listenerCounts()).toEqual(initialListeners)
      expect(
        server.config.configFileDependencies.some(path => path.startsWith(resolveOutputDir(root)))
      ).toBe(false)
    }
    await server.close()
    expect(server.watcher.getWatched()).toEqual({})
  })

  test('recovers after an existing helper is removed and recreated', async () => {
    const { root, server, write, bundle, errors } = await start()
    const previousConfig = server.config
    const previousBundle = bundle()
    rmSync(join(root, 'helper.ts'))
    await vi.waitFor(
      () => expect(errors).toHaveBeenCalledWith('server restart failed', expect.anything()),
      { timeout: 3000 }
    )
    expect(server.config).toBe(previousConfig)
    expect(bundle()).toBe(previousBundle)
    write('helper.ts', `export const value = 'recreated'`)
    await vi.waitFor(
      () => {
        expect(server.config).not.toBe(previousConfig)
        expect(bundle()).toContain('recreated')
      },
      { timeout: 3000 }
    )
  }, 10000)

  test.each(['watcher', 'manual', 'host dependency', 'new dependency'] as const)(
    'retains a save arriving before a %s restart completes',
    async origin => {
      const { root, server, write, bundle } = await start()
      const helper = origin === 'new dependency' ? '../shared/new-helper.ts' : 'helper.ts'
      if (origin === 'host dependency') {
        server.config.configFileDependencies.push(join(root, 'helper.ts'))
      }
      const watcher = server.watcher
      let release!: () => void
      const barrier = new Promise<void>(resolve => {
        release = resolve
      })
      let paused = false
      server.config.inlineConfig.plugins!.push({
        name: 'test:pause-first-restart',
        async configResolved() {
          if (!paused) {
            paused = true
            await barrier
          }
        }
      })
      try {
        write(helper, `export const value = 'first save'`)
        if (origin === 'new dependency') {
          write(
            'worker.ts',
            `import { value } from '${helper}'; export default { define: { value } }`
          )
        }
        if (origin === 'manual') {
          void server.restart()
        }
        await vi.waitFor(
          () => {
            expect(paused).toBe(true)
            expect(bundle()).toContain('first save')
          },
          { timeout: 3000 }
        )
        write(helper, `export const value = 'saved during restart'`)
        // Deliver the overlapping notification deterministically: Chokidar can
        // throttle two real saves within 50ms into a single change event.
        watcher.emit('change', join(root, helper))
        await setImmediate()
      } finally {
        release()
        await server.restart()
      }
      await vi.waitFor(() => expect(bundle()).toContain('saved during restart'), { timeout: 3000 })
    },
    10000
  )

  test.each(['./new-helper.ts', '../shared/new-helper.ts'])(
    'recovers by fixing only a newly added invalid helper at %s',
    async helper => {
      const { server, write, bundle, errors } = await start()
      const previousConfig = server.config
      const previousBundle = bundle()
      // Config-file reloads create fresh plugin instances, unlike inline plugin arrays.
      server.config.inlineConfig.plugins![0] = Vrowzer({
        auto: false,
        workerConfig: './worker.ts'
      }).find(plugin => plugin.name === 'vrowzer:config')!
      write(helper, 'export const value = {')
      write('worker.ts', `import { value } from '${helper}'; export default { define: { value } }`)
      await vi.waitFor(
        () => expect(errors).toHaveBeenCalledWith('server restart failed', expect.anything()),
        { timeout: 3000 }
      )
      expect(server.config).toBe(previousConfig)
      expect(bundle()).toBe(previousBundle)
      const previousErrors = errors.mock.calls.length
      write(helper, 'export const value = [')
      await vi.waitFor(() => expect(errors.mock.calls.length).toBeGreaterThan(previousErrors))
      await delay(150)
      const failedErrors = errors.mock.calls.length
      await delay(150)
      expect(errors).toHaveBeenCalledTimes(failedErrors)
      expect(bundle()).toBe(previousBundle)
      write(helper, `export const value = 'repaired'`)
      await vi.waitFor(
        () => {
          expect(server.config).not.toBe(previousConfig)
          expect(bundle()).toContain('repaired')
        },
        { timeout: 3000 }
      )
    },
    10000
  )

  test.each([false, true])(
    'recovers new dependencies after a manual restart with force=%s',
    async force => {
      const { server, write, bundle, errors } = await start()
      const previousBundle = bundle()
      write(
        'other-worker.ts',
        `import { value } from '../other/helper.ts'; export default { define: { value } }`
      )
      write('../other/helper.ts', 'export const value = {')
      server.config.inlineConfig.plugins![0] = Vrowzer({
        auto: false,
        workerConfig: './other-worker.ts'
      }).find(plugin => plugin.name === 'vrowzer:config')!
      await server.restart(force)
      expect(errors).toHaveBeenCalledWith('server restart failed', expect.anything())
      expect(bundle()).toBe(previousBundle)
      write('../other/helper.ts', `export const value = 'repaired after manual restart'`)
      await vi.waitFor(() => expect(bundle()).toContain('repaired after manual restart'), {
        timeout: 3000
      })
    },
    10000
  )

  test.each([
    [
      'explicit import',
      `import { value } from '../shared/missing.ts'`,
      '../shared/missing.ts',
      `export const value = 'recovered data'`
    ],
    [
      'extensionless import',
      `import { value } from '../shared/missing'`,
      '../shared/missing.ts',
      `export const value = 'recovered data'`
    ],
    [
      'nested import',
      `import { value } from '../shared/nested/missing.ts'`,
      '../shared/nested/missing.ts',
      `export const value = 'recovered data'`
    ],
    [
      'directory index import',
      `import { value } from '../shared/missing'`,
      '../shared/missing/index.ts',
      `export const value = 'recovered data'`
    ],
    [
      'inline text',
      `import { readFileSync } from 'node:fs'; const value = readFileSync(new URL('../shared/missing.txt', import.meta.url), 'utf8')`,
      '../shared/missing.txt',
      'recovered data'
    ],
    [
      'inline JSON',
      `import { createRequire } from 'node:module'; const value = createRequire(import.meta.url)('../shared/missing.json')`,
      '../shared/missing.json',
      '"recovered data"'
    ]
  ])(
    'recovers when a missing %s is created after failed generation',
    async (_, source, file, contents) => {
      const { server, write, bundle, errors } = await start()
      const previousConfig = server.config
      const previousBundle = bundle()
      write('worker.ts', `${source}; export default { define: { value } }`)
      await vi.waitFor(
        () => expect(errors).toHaveBeenCalledWith('server restart failed', expect.anything()),
        { timeout: 3000 }
      )
      expect(bundle()).toBe(previousBundle)
      write(file, contents)
      await vi.waitFor(
        () => {
          expect(server.config).not.toBe(previousConfig)
          expect(bundle()).toContain('recovered data')
        },
        { timeout: 3000 }
      )
    },
    10000
  )

  test('waits for another edit when a host hook fails before Worker config resolution', async () => {
    const { server, write, bundle, errors } = await start()
    let fail = true
    server.config.inlineConfig.plugins!.unshift({
      name: 'test:host-config-error',
      config() {
        if (fail) {
          throw new Error('host config failed')
        }
      }
    })
    write('helper.ts', `export const value = 'host failure'`)
    await vi.waitFor(() =>
      expect(errors).toHaveBeenCalledWith('server restart failed', expect.anything())
    )
    await delay(150)
    const count = errors.mock.calls.length
    await delay(150)
    expect(errors).toHaveBeenCalledTimes(count)
    expect(bundle()).toContain('first')
    fail = false
    write('helper.ts', `export const value = 'host recovered'`)
    await vi.waitFor(() => expect(bundle()).toContain('host recovered'), { timeout: 3000 })
  })

  test('keeps watch state isolated between hosts and stops after close', async () => {
    const first = await start()
    const second = await start()
    const firstConfig = first.server.config
    const secondConfig = second.server.config
    let originalRestart: ViteDevServer['restart'] | undefined
    first.server.config.inlineConfig.plugins!.unshift({
      name: 'test:capture-native-restart',
      enforce: 'pre',
      configureServer(server) {
        originalRestart = server.restart
      }
    })
    first.write('helper.ts', `export const value = 'only first'`)
    await vi.waitFor(
      () => {
        expect(first.server.config).not.toBe(firstConfig)
        expect(first.bundle()).toContain('only first')
      },
      { timeout: 3000 }
    )
    expect(second.server.config).toBe(secondConfig)
    expect(second.bundle()).toContain('first')
    expect(first.server.restart).not.toBe(originalRestart)
    await first.server.close()
    expect(first.server.restart).toBe(originalRestart)
    first.write('helper.ts', `export const value = 'after close'`)
    await delay(150)
    expect(first.bundle()).toContain('only first')
    expect(first.server.watcher.listenerCount('change')).toBe(0)
    expect(first.server.watcher.listenerCount('ready')).toBe(0)
  })
})
