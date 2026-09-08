import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { setImmediate } from 'node:timers/promises'
import { createLogger } from 'vite'
import { describe, expect, onTestFinished, test, vi } from 'vite-plus/test'
import { browser, isServe } from '~utils'
import { startServer } from '../vitestSetup.ts'

import type { Page, Worker } from '@playwright/test'
import type { ViteDevServer } from 'vite'

function temporaryHost() {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'vrowzer-config-e2e-')))
  const root = join(directory, 'vite-worker-config')
  try {
    cpSync(import.meta.dirname, root, {
      recursive: true,
      filter: path =>
        !['node_modules', 'dist'].includes(basename(path)) && !path.endsWith('.spec.ts')
    })
    // Link packages individually so the copied host owns its .vite and .vrowzer output.
    const modules = join(root, 'node_modules')
    mkdirSync(modules)
    for (const name of readdirSync(join(import.meta.dirname, 'node_modules'))) {
      if (!name.startsWith('.')) {
        symlinkSync(
          realpathSync(join(import.meta.dirname, 'node_modules', name)),
          join(modules, name),
          'dir'
        )
      }
    }
    symlinkSync(
      resolve(import.meta.dirname, '../../node_modules/vite-plus'),
      join(modules, 'vite-plus'),
      'dir'
    )
    symlinkSync(
      resolve(import.meta.dirname, '../vite-svelte'),
      join(directory, 'vite-svelte'),
      'dir'
    )
    return {
      root,
      write(file: string, content: string) {
        writeFileSync(join(root, file), content)
      },
      remove() {
        rmSync(directory, { recursive: true, force: true })
      }
    }
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}

describe('Worker resolve migration in an isolated host', () => {
  test.each([
    { name: 'legacy only', dedicated: false, legacy: true },
    { name: 'legacy override', dedicated: true, legacy: true },
    { name: 'migrated to dedicated config', dedicated: true, legacy: false }
  ])('$name', async ({ dedicated, legacy }) => {
    const host = temporaryHost()
    let trialPage: Page | undefined
    let trialServer: Awaited<ReturnType<typeof startServer>>['server'] | undefined
    onTestFinished(async () => {
      await trialPage?.close()
      await trialServer?.close()
      host.remove()
    })

    const alias = { alias: [{ find: 'preview-lib', replacement: '/vendor/preview-lib.js' }] }
    host.write(
      'vite.config.ts',
      `
      import react from '@vitejs/plugin-react'
      import { Vrowzer } from '@vrowzer/vite-plugin'
      import { defineConfig } from 'vite-plus'
      export default defineConfig(() => ({
        server: { fs: { allow: ${JSON.stringify([host.root, resolve(import.meta.dirname, '../..')])} } },
        plugins: [react(), Vrowzer(${JSON.stringify({
          auto: false,
          extract: false,
          basePath: '/worker-preview/',
          ...(dedicated ? { workerConfig: './vrowzer.worker.config.ts' } : {}),
          ...(legacy ? { resolve: alias } : {})
        })})],
      }))
    `
    )
    host.write(
      'vrowzer.worker.config.ts',
      `
      import { defineConfig } from 'vite'
      export default defineConfig({
        resolve: {
          alias: [{ find: 'preview-lib', replacement: ${JSON.stringify(legacy ? '/incorrect.js' : '/vendor/preview-lib.js')} }],
          dedupe: ['dedicated-only']
        },
        plugins: [{
          name: 'worker-resolve-contract',
          configResolved(config) {
            if (config.resolve.dedupe.includes('dedicated-only') !== ${!legacy}) {
              throw new Error('Unexpected Worker resolve merge')
            }
          }
        }]
      })
    `
    )
    host.write(
      'index.ts',
      `
      import { createElement } from 'react'
      import { createRoot } from 'react-dom/client'
      import { Vrowzer } from 'vrowzer'
      createRoot(document.getElementById('host-app')).render(createElement('strong', {}, 'React host'))
      const instance = Vrowzer()
      const ready = await instance.ready({ files: {
        '/index.html': '<div id="app"></div><script type="module" src="/main.js"></script>',
        '/main.js': "import { label } from 'preview-lib'; document.querySelector('#app').textContent = label",
        '/vendor/preview-lib.js': 'export const label = "alias works"',
      } })
      if (ready) instance.mount(document.getElementById('app'), { id: 'preview' })
      document.getElementById('status').textContent = ready ? 'Ready' : 'Failed'
    `
    )

    const logger = createLogger('silent')
    const warn = vi.spyOn(logger, 'warn')
    const result = await startServer(host.root, logger)
    trialServer = result.server
    trialPage = await browser.newPage()
    const errors: string[] = []
    const logs: string[] = []
    const requests: string[] = []
    trialPage.on('pageerror', error => errors.push(error.message))
    trialPage.on('console', message => logs.push(message.text()))
    trialPage.on('request', request => requests.push(request.url()))
    await trialPage.goto(result.serverUrl)
    await trialPage.waitForFunction(() =>
      ['Ready', 'Failed'].includes(document.getElementById('status')?.textContent ?? '')
    )
    const status = await trialPage.textContent('#status')
    expect(status, logs.join('\n')).toBe('Ready')
    await expect
      .poll(() => trialPage!.frameLocator('iframe').locator('#app').textContent())
      .toBe('alias works')
    expect(errors).toEqual([])

    const warnings = warn.mock.calls.filter(([message]) =>
      message.includes('Vrowzer({ resolve }) is deprecated')
    )
    expect(warnings.length > 0).toBe(legacy)
    if (isServe) {
      expect(requests.some(url => url.includes('/web-worker-transformer.js'))).toBe(true)
      expect(requests.some(url => url.includes('/transformer-chunks/'))).toBe(false)
    }
  })
})

test.runIf(isServe)(
  'restarts the Worker after config edits, repairs and saves during restart',
  async () => {
    const host = temporaryHost()
    let trialPage: Page | undefined
    let trialServer: Awaited<ReturnType<typeof startServer>>['server'] | undefined
    onTestFinished(async () => {
      await trialPage?.close()
      await trialServer?.close()
      host.remove()
    })
    const read = (file: string) => readFileSync(join(host.root, file), 'utf8')
    host.write(
      'vite.config.ts',
      read('vite.config.ts').replace(
        'server: { forwardConsole: true }',
        `server: { forwardConsole: true, fs: { allow: ${JSON.stringify([host.root, resolve(import.meta.dirname, '../..')])} } }`
      )
    )
    const logger = createLogger('silent')
    const errors = vi.spyOn(logger, 'error')
    const result = await startServer(host.root, logger)
    trialServer = result.server
    trialPage = await browser.newPage()
    const workers: Worker[] = []
    trialPage.on('worker', worker => {
      if (new URL(worker.url()).pathname.endsWith('/web-worker.ts')) {
        workers.push(worker)
      }
    })
    await trialPage.goto(result.serverUrl)

    const previewText = (selector: string) =>
      trialPage!.frameLocator('iframe').locator(selector).textContent({ timeout: 1000 })
    await expect.poll(() => previewText('#worker-define'), { timeout: 10000 }).toBe('worker define')
    expect(await previewText('#spacing')).toBe('before    after')

    const edits = [
      {
        file: 'vrowzer.worker.config.ts',
        source: read('vrowzer.worker.config.ts').replace(
          'JSON.stringify(marker)',
          "JSON.stringify(marker + ' config')"
        ),
        marker: 'worker define config',
        spacing: 'before    after'
      },
      {
        file: 'preview/options.ts',
        source: read('preview/options.ts').replace('.trim()', '.trim().toUpperCase()'),
        marker: 'WORKER DEFINE config',
        spacing: 'before    after'
      },
      {
        file: 'preview/marker.txt',
        source: 'changed text\n',
        marker: 'CHANGED TEXT config',
        spacing: 'before    after'
      },
      {
        file: 'preview/compiler-options.json',
        source: JSON.stringify({ preserveWhitespace: false }),
        marker: 'CHANGED TEXT config',
        spacing: 'before after'
      }
    ]
    for (const edit of edits) {
      const previousWorkers = workers.length
      host.write(edit.file, edit.source)
      await expect
        .poll(() => workers.length, { timeout: 10000, message: edit.file })
        .toBeGreaterThan(previousWorkers)
      await expect.poll(() => previewText('#worker-define'), { timeout: 10000 }).toBe(edit.marker)
      await expect.poll(() => previewText('#spacing'), { timeout: 10000 }).toBe(edit.spacing)
      expect(await trialPage.textContent('#status')).toBe('Ready')
    }
    expect(errors).not.toHaveBeenCalled()

    const devServer = trialServer as ViteDevServer
    const previousConfig = devServer.config
    const previousWorkers = workers.length
    host.write('preview/new-marker.ts', 'export const marker = {')
    host.write(
      'vrowzer.worker.config.ts',
      read('vrowzer.worker.config.ts').replace(
        "import { compilerOptions, marker } from './preview/options.ts'",
        "import { compilerOptions } from './preview/options.ts'\nimport { marker } from './preview/new-marker.ts'"
      )
    )
    await expect
      .poll(() => errors.mock.calls.some(([message]) => message === 'server restart failed'))
      .toBe(true)
    expect(devServer.config).toBe(previousConfig)
    expect(workers.length).toBe(previousWorkers)
    expect(await previewText('#worker-define')).toBe('CHANGED TEXT config')
    host.write('preview/new-marker.ts', `export const marker = 'repaired'`)
    await expect
      .poll(() => previewText('#worker-define'), { timeout: 10000 })
      .toBe('repaired config')
    expect(workers.length).toBeGreaterThan(previousWorkers)

    let release!: () => void
    const barrier = new Promise<void>(resolve => {
      release = resolve
    })
    let paused = false
    devServer.config.inlineConfig.plugins ??= []
    devServer.config.inlineConfig.plugins.push({
      name: 'test:hold-restart',
      async configResolved() {
        if (!paused) {
          paused = true
          await barrier
        }
      }
    })
    const watcher = devServer.watcher
    let changed: string | undefined
    const onChange = (file: string) => {
      changed = file
    }
    try {
      host.write('preview/new-marker.ts', `export const marker = 'first save'`)
      void devServer.restart(true)
      await expect.poll(() => paused).toBe(true)
      await expect
        .poll(() => read('node_modules/.vrowzer/config.bundled.mjs'))
        .toContain('first save')
      watcher.on('change', onChange)
      host.write('preview/new-marker.ts', `export const marker = 'last save'`)
      await expect.poll(() => changed).toBe(join(host.root, 'preview/new-marker.ts'))
      await setImmediate()
    } finally {
      watcher.off('change', onChange)
      release()
      await devServer.restart()
    }
    await expect
      .poll(() => previewText('#worker-define'), { timeout: 10000 })
      .toBe('last save config')
    expect(await trialPage.textContent('#status')).toBe('Ready')
  }
)
