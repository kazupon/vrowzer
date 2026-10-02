/**
 * SPIKE (#36): vrowzer.build() builds a library in a dedicated build Worker with Vite's pipeline.
 *
 * Measurements are written to SPIKE_OUT (JSON) for the notes.
 */

import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, CDPSession, Page } from '@playwright/test'
import type { PreviewServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'build-spike')
const OUT_DIR = join(FIXTURE_DIR, '.spike-out')
const SPIKE_OUT = process.env.SPIKE_OUT ?? join(OUT_DIR, 'spike-result.json')

let browser: Browser
let browserCdp: CDPSession
let server: PreviewServer
let origin: string
const measurements: Record<string, unknown> = {}

async function rendererRssMiB(): Promise<number> {
  const { processInfo } = (await browserCdp.send('SystemInfo.getProcessInfo')) as {
    processInfo: { type: string; id: number }[]
  }
  const pids = processInfo.filter(p => p.type === 'renderer').map(p => p.id)
  const out = execFileSync('ps', ['-o', 'rss=', '-p', pids.join(',')], { encoding: 'utf8' })
  const kib = out
    .split('\n')
    .map(line => Number(line.trim()))
    .filter(n => Number.isFinite(n) && n > 0)
    .reduce((a, b) => a + b, 0)
  return Math.round((kib / 1024) * 10) / 10
}

async function openFixture(
  filesKey = '__libraryFiles__'
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${origin}/`)
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
  const ready = await page.evaluate(async key => {
    const fixture = window as any
    const vrowzer = fixture.__createVrowzer__()
    fixture.__vrowzer__ = vrowzer
    return vrowzer.ready({ files: fixture[key] })
  }, filesKey)
  expect(ready).toBe(true)
  return { context, page }
}

async function runBuild(page: Page, options: Record<string, unknown>) {
  return page.evaluate(async buildOptions => {
    const start = performance.now()
    try {
      const result = await (window as any).__vrowzer__.build(buildOptions)
      const files: Record<string, string> = {}
      for (const [name, content] of Object.entries(result.files)) {
        files[name] =
          typeof content === 'string' ? content : `[binary ${(content as ArrayBuffer).byteLength}]`
      }
      return {
        ok: true,
        files,
        warnings: result.warnings.map((w: any) => w.message),
        timings: result.timings,
        roundTrip: performance.now() - start
      }
    } catch (error: any) {
      return {
        ok: false,
        error: {
          name: error?.name,
          message: error?.message,
          plugin: error?.plugin,
          id: error?.id,
          loc: error?.loc
        },
        roundTrip: performance.now() - start
      }
    }
  }, options)
}

async function importBuiltLibrary(files: Record<string, string>, entry: string, name: string) {
  const dir = join(OUT_DIR, name)
  rmSync(dir, { recursive: true, force: true })
  for (const [file, content] of Object.entries(files)) {
    const path = join(dir, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  return import(pathToFileURL(join(dir, entry)).href)
}

const LIB_OPTIONS = {
  define: { __APP_FLAG__: JSON.stringify('on') },
  build: {
    lib: { entry: '/src/index.ts', formats: ['es'] },
    minify: false,
    sourcemap: true
  }
}

beforeAll(async () => {
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  await build({ root: FIXTURE_DIR, logLevel: 'silent' })
  server = await preview({
    root: FIXTURE_DIR,
    logLevel: 'silent',
    preview: { port: 0, strictPort: false }
  })
  const address = server.httpServer?.address()
  if (typeof address !== 'object' || !address) {
    throw new Error('Failed to get the server address')
  }
  origin = `http://localhost:${address.port}`
  browser = await chromium.launch({ headless: true })
  browserCdp = await browser.newBrowserCDPSession()
}, 180_000)

afterAll(async () => {
  writeFileSync(SPIKE_OUT, JSON.stringify(measurements, null, 2))
  await browser?.close()
  await server?.close()
})

describe('vrowzer.build() spike', () => {
  test('builds a library with Vite in the build Worker', async () => {
    const { context, page } = await openFixture()
    try {
      measurements.rssAfterReady = await rendererRssMiB()
      measurements.workersAfterReady = page.workers().length

      const first = await runBuild(page, LIB_OPTIONS)
      measurements.rssAfterFirstBuild = await rendererRssMiB()
      measurements.workersAfterFirstBuild = page.workers().length
      expect(first.ok, JSON.stringify(first.error)).toBe(true)
      measurements.firstBuild = {
        roundTrip: first.roundTrip,
        timings: first.timings,
        files: Object.keys(first.files!),
        warnings: first.warnings
      }

      const files = first.files!
      expect(Object.keys(files)).toEqual(
        expect.arrayContaining(['my-lib.js', 'my-lib.css', 'my-lib.js.map'])
      )
      expect(Object.keys(files).some(f => /^lazy-.+\.js$/.test(f))).toBe(true)
      expect(files['my-lib.css']).toContain('.lib-title')
      expect(files['my-lib.js']).not.toContain('tree-shaken-away')

      const lib = await importBuiltLibrary(files, 'my-lib.js', 'first')
      expect(lib.default('vrowzer')).toBe('Hello, vrowzer')
      expect(lib.add(1, 2)).toBe(3)
      expect(lib.version).toBe('1.2.3')
      expect(await lib.loadLazy()).toBe('lazy-chunk-value')
      expect(lib.mode).toBe('production')
      expect(lib.prod).toBe(true)
      expect(lib.dev).toBe(false)
      expect(lib.flag).toBe('on')
      expect(lib.logoUrl).toMatch(/^data:image\/svg\+xml/)
      // Decision 5 (R3): each build creates new plugin instances from the config
      measurements.pluginState = {
        first: {
          transforms: lib.spikeTransforms,
          instance: lib.spikeInstance,
          nodeEnvAtConfig: lib.spikeNodeEnvAtConfig
        }
      }
      expect(lib.spikeTransforms).toBe(1)
      expect(lib.spikeNodeEnvAtConfig).toBe('production')

      // Repeated builds in the same Worker
      const repeats: number[] = []
      for (let i = 0; i < 5; i++) {
        const r = await runBuild(page, LIB_OPTIONS)
        expect(r.ok).toBe(true)
        repeats.push(Math.round(r.roundTrip))
      }
      measurements.repeatBuilds = repeats
      const again = await runBuild(page, LIB_OPTIONS)
      const againLib = await importBuiltLibrary(again.files!, 'my-lib.js', 'again')
      ;(measurements.pluginState as any).again = {
        transforms: againLib.spikeTransforms,
        instance: againLib.spikeInstance
      }
      expect(againLib.spikeTransforms).toBe(1)
      expect(againLib.spikeInstance).not.toBe(lib.spikeInstance)
      measurements.rssAfterRepeats = await rendererRssMiB()

      // Single-file output
      const single = await runBuild(page, {
        ...LIB_OPTIONS,
        build: {
          ...LIB_OPTIONS.build,
          minify: true,
          sourcemap: false,
          rolldownOptions: { output: { codeSplitting: false } }
        }
      })
      expect(single.ok, JSON.stringify(single.error)).toBe(true)
      measurements.singleFiles = Object.keys(single.files!)
      expect(Object.keys(single.files!).filter(f => f.endsWith('.js'))).toEqual(['my-lib.js'])
      const singleLib = await importBuiltLibrary(single.files!, 'my-lib.js', 'single')
      expect(await singleLib.loadLazy()).toBe('lazy-chunk-value')
      expect(singleLib.default('x')).toBe('Hello, x')
      measurements.singleSize = single.files!['my-lib.js']!.length
      measurements.splitSize = files['my-lib.js']!.length
    } finally {
      await context.close()
    }
  }, 180_000)

  test('follows the file operations, recovers from a syntax error, and keeps the preview', async () => {
    const { context, page } = await openFixture()
    try {
      await page.evaluate(async () => {
        const vrowzer = (window as any).__vrowzer__
        await vrowzer.updateFile(
          '/src/math.ts',
          'export function add(a: number, b: number): number { return a + b + 100 }\n'
        )
        await vrowzer.deleteFile('/src/style.css')
        await vrowzer.updateFile(
          '/src/index.ts',
          (window as any).__libraryFiles__['/src/index.ts'].replace("import './style.css'\n", '')
        )
      })
      const updated = await runBuild(page, LIB_OPTIONS)
      expect(updated.ok, JSON.stringify(updated.error)).toBe(true)
      expect(Object.keys(updated.files!)).not.toContain('my-lib.css')
      const lib = await importBuiltLibrary(updated.files!, 'my-lib.js', 'updated')
      expect(lib.add(1, 2)).toBe(103)

      // A syntax error, then the fix
      await page.evaluate(() =>
        (window as any).__vrowzer__.updateFile(
          '/src/math.ts',
          'export function add(a: number, b: number): number { return a + }\n'
        )
      )
      const broken = await runBuild(page, LIB_OPTIONS)
      expect(broken.ok).toBe(false)
      measurements.syntaxError = broken.error
      await page.evaluate(() =>
        (window as any).__vrowzer__.updateFile(
          '/src/math.ts',
          'export function add(a: number, b: number): number { return a + b }\n'
        )
      )
      const fixed = await runBuild(page, LIB_OPTIONS)
      expect(fixed.ok, JSON.stringify(fixed.error)).toBe(true)

      // Overlapping calls are rejected
      const overlap = await page.evaluate(async buildOptions => {
        const vrowzer = (window as any).__vrowzer__
        const a = vrowzer.build(buildOptions)
        const b = vrowzer.build(buildOptions).then(
          () => 'resolved',
          (e: Error) => e.message
        )
        await a
        return b
      }, LIB_OPTIONS)
      expect(overlap).toContain('already running')

      // The preview still works
      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
      })
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return iframe?.contentDocument?.querySelector('#app')?.textContent ?? ''
            }),
          { timeout: 30_000 }
        )
        .toBe('preview ok')

      // dispose() terminates the build Worker
      const before = await page.evaluate(() => (window as any).__pageWorkers__())
      measurements.pageWorkersBeforeDispose = before
      measurements.rssBeforeDispose = await rendererRssMiB()
      await page.evaluate(() => (window as any).__vrowzer__.dispose())
      await page.waitForTimeout(1500)
      measurements.workersAfterDispose = page.workers().length
      measurements.rssAfterDispose = await rendererRssMiB()
    } finally {
      await context.close()
    }
  }, 180_000)
  test('builds an HTML app that runs on another origin without the Service Worker', async () => {
    const { context, page } = await openFixture('__appFiles__')
    try {
      const builds: Record<string, unknown> = {}
      for (const base of ['/', './']) {
        const built = await page.evaluate(async buildBase => {
          try {
            const result = await (window as any).__vrowzer__.build({ base: buildBase })
            const files: Record<string, { text?: string; bytes?: number[] }> = {}
            for (const [name, content] of Object.entries(result.files)) {
              files[name] =
                typeof content === 'string'
                  ? { text: content }
                  : { bytes: Array.from(new Uint8Array(content as ArrayBuffer)) }
            }
            return { ok: true, files, warnings: result.warnings.map((w: any) => w.message) }
          } catch (error: any) {
            return { ok: false, error: String(error?.message ?? error) }
          }
        }, base)
        expect(built.ok, (built as any).error).toBe(true)
        builds[base] = built
      }

      const bigPng: number[] = await page.evaluate(() => (window as any).__bigPng__)
      const results: Record<string, unknown> = {}
      for (const [base, prefix] of [
        ['/', '/'],
        ['./', '/sub/dir/']
      ] as const) {
        const built = builds[base] as {
          files: Record<string, { text?: string; bytes?: number[] }>
          warnings: string[]
        }
        const appContext = await browser.newContext()
        const builtOrigin = 'https://built.vrowzer.test'
        await appContext.route(`${builtOrigin}/**`, route => {
          const url = new URL(route.request().url())
          let name = url.pathname.slice(prefix.length)
          if (name === '') {
            name = 'index.html'
          }
          const file = built.files[name]
          if (!url.pathname.startsWith(prefix) || !file) {
            return route.fulfill({ status: 404, body: 'not found' })
          }
          const type = name.endsWith('.html')
            ? 'text/html'
            : name.endsWith('.js')
              ? 'text/javascript'
              : name.endsWith('.css')
                ? 'text/css'
                : name.endsWith('.png')
                  ? 'image/png'
                  : 'text/plain'
          return route.fulfill({
            status: 200,
            contentType: type,
            body: file.text !== undefined ? file.text : Buffer.from(file.bytes!)
          })
        })
        const appPage = await appContext.newPage()
        const pageErrors: string[] = []
        const consoleMessages: string[] = []
        const failedRequests: string[] = []
        appPage.on('pageerror', e => pageErrors.push(e.message))
        appPage.on('console', m => consoleMessages.push(`${m.type()}: ${m.text()}`))
        appPage.on('response', r => {
          if (r.status() >= 400) {
            failedRequests.push(`${r.status()} ${r.url()}`)
          }
        })
        appPage.on('requestfailed', r => failedRequests.push(`failed ${r.url()}`))
        // Dump the built files for inspection
        const dumpDir = join(OUT_DIR, `app-${base === '/' ? 'root' : 'relative'}`)
        rmSync(dumpDir, { recursive: true, force: true })
        for (const [name, file] of Object.entries(built.files)) {
          const target = join(dumpDir, name)
          mkdirSync(dirname(target), { recursive: true })
          writeFileSync(target, file.text !== undefined ? file.text : Buffer.from(file.bytes!))
        }
        measurements[`appDebug:${base}`] = { pageErrors, consoleMessages, failedRequests }
        await appPage.goto(`${builtOrigin}${prefix}`)
        await expect
          .poll(() => appPage.evaluate(() => document.body.dataset.lazy ?? ''), { timeout: 15_000 })
          .toBe('lazy ok')
        const state = await appPage.evaluate(async () => {
          const app = document.querySelector('#app') as HTMLElement
          const style = getComputedStyle(app)
          const big = document.querySelector('#big') as HTMLImageElement
          const bigResponse = await fetch(big.src)
          return {
            text: app.textContent,
            color: style.color,
            background: style.backgroundColor,
            smallSrc: (document.querySelector('#small') as HTMLImageElement).src.slice(0, 26),
            bigSrc: big.getAttribute('src'),
            bigBytes: Array.from(new Uint8Array(await bigResponse.arrayBuffer())),
            controller: navigator.serviceWorker?.controller ?? null,
            robots: await (await fetch('robots.txt')).text()
          }
        })
        results[base] = {
          files: Object.keys(built.files),
          warnings: built.warnings,
          text: state.text,
          color: state.color,
          background: state.background,
          smallSrc: state.smallSrc,
          bigSrc: state.bigSrc,
          bigBytesEqual: JSON.stringify(state.bigBytes) === JSON.stringify(bigPng),
          robots: state.robots,
          pageErrors
        }
        expect(state.text).toBe('app ok')
        expect(state.color).toBe('rgb(0, 128, 0)')
        expect(state.background).toBe('rgb(255, 255, 0)')
        expect(state.smallSrc).toMatch(/^data:image\/svg\+xml,/)
        expect(state.bigBytes).toEqual(bigPng)
        expect(state.controller).toBeNull()
        expect(state.robots).toBe('User-agent: *\n')
        expect(pageErrors).toEqual([])
        await appContext.close()
      }
      measurements.app = results
    } finally {
      await context.close()
    }
  }, 180_000)
  test('measures the snapshot cost of large projects', async () => {
    const results: Record<string, unknown> = {}
    for (const [label, count, size] of [
      ['svelte-like (714 x 4.5 KiB)', 714, 4600],
      ['vue-like (334 x 37 KiB)', 334, 38000]
    ] as const) {
      const context = await browser.newContext()
      const page = await context.newPage()
      try {
        await page.goto(`${origin}/`)
        await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
        const measured = await page.evaluate(
          async ({ fileCount, fileSize, buildOptions }) => {
            const fixture = window as any
            const files: Record<string, string> = { ...fixture.__libraryFiles__ }
            for (let i = 0; i < fileCount; i++) {
              files[`/node_modules/pkg-${i}/index.js`] =
                `export const v${i} = ${JSON.stringify('x'.repeat(fileSize))}\n`
            }
            const vrowzer = fixture.__createVrowzer__()
            fixture.__vrowzer__ = vrowzer
            await vrowzer.ready({ files })
            const rounds: { roundTrip: number; write: number; build: number }[] = []
            for (let i = 0; i < 3; i++) {
              const start = performance.now()
              const result = await vrowzer.build(buildOptions)
              rounds.push({
                roundTrip: Math.round(performance.now() - start),
                write: Math.round(result.timings.write),
                build: Math.round(result.timings.build)
              })
            }
            const totalBytes = Object.values(files).reduce((a, c) => a + (c as string).length, 0)
            await vrowzer.dispose()
            return { totalMiB: Math.round((totalBytes / 1048576) * 10) / 10, rounds }
          },
          { fileCount: count, fileSize: size, buildOptions: LIB_OPTIONS }
        )
        results[label] = measured
      } finally {
        await context.close()
      }
    }
    measurements.snapshotCost = results
  }, 180_000)
})
