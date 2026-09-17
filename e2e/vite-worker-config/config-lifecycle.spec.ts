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

describe('bundled dev mode in an isolated host', () => {
  test('fails Worker setup when an environment is bundled during serve', async () => {
    const host = temporaryHost()
    let trialPage: Page | undefined
    let trialServer: Awaited<ReturnType<typeof startServer>>['server'] | undefined
    onTestFinished(async () => {
      await trialPage?.close()
      await trialServer?.close()
      host.remove()
    })

    host.write(
      'vite.config.ts',
      `
      import { Vrowzer } from '@vrowzer/vite-plugin'
      import { defineConfig } from 'vite-plus'
      export default defineConfig(() => ({
        server: { fs: { allow: ${JSON.stringify([host.root, resolve(import.meta.dirname, '../..')])} } },
        plugins: [Vrowzer(${JSON.stringify({
          auto: false,
          extract: false,
          basePath: '/worker-preview/',
          workerConfig: './vrowzer.worker.config.ts'
        })})],
      }))
    `
    )
    host.write(
      'vrowzer.worker.config.ts',
      `
      import { defineConfig } from 'vite'
      export default defineConfig({
        environments: { client: { isBundled: true } }
      })
    `
    )
    host.write(
      'index.ts',
      `
      import { Vrowzer } from 'vrowzer'
      const instance = Vrowzer()
      const ready = await instance.ready({ files: {
        '/index.html': '<div id="app"></div><script type="module" src="/main.js"></script>',
        '/main.js': "document.querySelector('#app').textContent = 'preview works'",
      } })
      if (ready) instance.mount(document.getElementById('app'), { id: 'preview' })
      document.getElementById('status').textContent = ready ? 'Ready' : 'Failed'
    `
    )

    const result = await startServer(host.root, createLogger('silent'))
    trialServer = result.server
    trialPage = await browser.newPage()
    const logs: string[] = []
    trialPage.on('console', message => logs.push(message.text()))
    await trialPage.goto(result.serverUrl)
    await trialPage.waitForFunction(() =>
      ['Ready', 'Failed'].includes(document.getElementById('status')?.textContent ?? '')
    )

    expect(await trialPage.textContent('#status'), logs.join('\n')).toBe('Failed')
    expect(logs.join('\n')).toContain(
      'Bundled dev mode is not supported: environment "client" is bundled during serve'
    )
  })
})

describe.runIf(isServe)('Worker config dev lifecycle', () => {
  async function startWorkerHost() {
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
    // Host restarts finish before the browser has initialized the new Worker and preview.
    const waitForPreview = async (marker: string) => {
      await expect.poll(() => previewText('#worker-define'), { timeout: 30000 }).toBe(marker)
    }
    await waitForPreview('worker define')
    expect(await previewText('#spacing')).toBe('before    after')

    return {
      host,
      read,
      page: trialPage,
      server: trialServer as ViteDevServer,
      workers,
      errors,
      previewText,
      waitForPreview
    }
  }

  test.each([
    {
      file: 'vrowzer.worker.config.ts',
      edit: (source: string) =>
        source.replace('JSON.stringify(marker)', "JSON.stringify(marker + ' config')"),
      marker: 'worker define config',
      spacing: 'before    after'
    },
    {
      file: 'preview/options.ts',
      edit: (source: string) => source.replace('.trim()', '.trim().toUpperCase()'),
      marker: 'WORKER DEFINE',
      spacing: 'before    after'
    },
    {
      file: 'preview/marker.txt',
      edit: () => 'changed text\n',
      marker: 'changed text',
      spacing: 'before    after'
    },
    {
      file: 'preview/compiler-options.json',
      edit: () => JSON.stringify({ preserveWhitespace: false }),
      marker: 'worker define',
      spacing: 'before after'
    }
  ])('restarts the Worker after editing $file', async ({ file, edit, marker, spacing }) => {
    const { host, read, page, workers, errors, previewText, waitForPreview } =
      await startWorkerHost()
    const previousWorkers = workers.length
    host.write(file, edit(read(file)))
    await expect
      .poll(() => workers.length, { timeout: 10000, message: file })
      .toBeGreaterThan(previousWorkers)
    await waitForPreview(marker)
    await expect.poll(() => previewText('#spacing'), { timeout: 10000 }).toBe(spacing)
    expect(await page.textContent('#status')).toBe('Ready')
    expect(errors).not.toHaveBeenCalled()
  })

  test('keeps the working config after an error and recovers when the new import is repaired', async () => {
    const {
      host,
      read,
      page,
      server: devServer,
      workers,
      errors,
      previewText,
      waitForPreview
    } = await startWorkerHost()
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
    expect(await previewText('#worker-define')).toBe('worker define')
    host.write('preview/new-marker.ts', `export const marker = 'repaired'`)
    await waitForPreview('repaired')
    expect(workers.length).toBeGreaterThan(previousWorkers)
    expect(await page.textContent('#status')).toBe('Ready')
  })

  test('applies the last save made while a forced restart is paused', async () => {
    const {
      host,
      read,
      page,
      server: devServer,
      workers,
      errors,
      waitForPreview
    } = await startWorkerHost()
    const previousWorkers = workers.length
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
    try {
      host.write('preview/marker.txt', 'first save\n')
      void devServer.restart(true)
      await expect.poll(() => paused).toBe(true)
      await expect
        .poll(() => read('node_modules/.vrowzer/config.bundled.mjs'))
        .toContain('first save')
      host.write('preview/marker.txt', 'last save\n')
      await setImmediate()
    } finally {
      release()
      await devServer.restart()
    }
    await waitForPreview('last save')
    expect(workers.length).toBeGreaterThan(previousWorkers)
    expect(await page.textContent('#status')).toBe('Ready')
    expect(errors).not.toHaveBeenCalled()
  })
})
