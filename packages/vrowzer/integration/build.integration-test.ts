import { chromium } from '@playwright/test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build, preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { PreviewServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'build')

let browser: Browser
let server: PreviewServer
let origin: string
const outputDirs: string[] = []

interface Fixture {
  context: BrowserContext
  page: Page
}

type SerializedContent = string | { bytes: number[] }

interface BuildLog {
  message: string
  code?: string
  plugin?: string
  id?: string
  loc?: { line: number; column: number; file?: string }
  frame?: string
}

type BuildOutcome =
  | { ok: true; files: Record<string, SerializedContent>; warnings: BuildLog[] }
  | {
      ok: false
      error: { name: string; message: string; isBuildError: boolean; errors: BuildLog[] }
    }

const LIBRARY_OPTIONS = {
  define: { __APP_FLAG__: JSON.stringify('on') },
  build: {
    lib: { entry: '/src/index.ts' },
    minify: false,
    sourcemap: true
  }
}

/**
 * Opens the fixture in a new browser context, which has a Service Worker of its own, and mounts a
 * preview of a ready Vrowzer instance with the files of the library or of the HTML app.
 */
async function openFixture(
  options: Record<string, unknown> = {},
  project: 'library' | 'app' = 'library'
): Promise<Fixture> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${origin}/`)
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
  const ready = await page.evaluate(
    async ([vrowzerOptions, projectName]) => {
      const fixture = window as any
      const vrowzer = fixture.__createVrowzer__(vrowzerOptions)
      fixture.__vrowzer__ = vrowzer
      const files = projectName === 'app' ? fixture.__appFiles__ : fixture.__projectFiles__
      const result = await vrowzer.ready({ files })
      if (result) {
        vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
      }
      return result
    },
    [options, project] as const
  )
  expect(ready).toBe(true)
  await expectPreviewText(page, project === 'app' ? 'app ok' : 'preview v1')
  return { context, page }
}

async function runBuild(page: Page, options?: unknown): Promise<BuildOutcome> {
  return page.evaluate(buildOptions => (window as any).__runBuild__(buildOptions), options)
}

async function expectBuilt(page: Page, options?: unknown) {
  const outcome = await runBuild(page, options)
  if (!outcome.ok) {
    throw new Error(`build() failed: ${JSON.stringify(outcome.error)}`)
  }
  return outcome
}

async function expectBuildError(page: Page, options?: unknown) {
  const outcome = await runBuild(page, options)
  if (outcome.ok) {
    throw new Error(`build() did not fail: ${Object.keys(outcome.files).join(', ')}`)
  }
  return outcome.error
}

async function writeFile(page: Page, path: string, content: string): Promise<void> {
  await page.evaluate(
    async ([filePath, fileContent]) => {
      await (window as any).__vrowzer__.updateFile(filePath, fileContent)
    },
    [path, content] as const
  )
}

/**
 * Writes the outputs to a new directory, and imports the entry in Node.
 */
async function importLibrary(files: Record<string, SerializedContent>, entry: string) {
  const dir = mkdtempSync(join(tmpdir(), 'vrowzer-build-output-'))
  outputDirs.push(dir)
  for (const [file, content] of Object.entries(files)) {
    const path = join(dir, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, typeof content === 'string' ? content : Uint8Array.from(content.bytes))
  }
  return import(pathToFileURL(join(dir, entry)).href)
}

async function previewText(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (
        document.querySelector('#preview-container iframe') as HTMLIFrameElement | null
      )?.contentDocument?.querySelector('#app')?.textContent ?? ''
  )
}

async function expectPreviewText(page: Page, text: string): Promise<void> {
  await expect.poll(() => previewText(page), { timeout: 30_000 }).toBe(text)
}

/**
 * Checks that the preview still works: HMR updates it after a change.
 */
async function expectPreviewUpdates(page: Page, text: string): Promise<void> {
  await page.evaluate(async content => {
    const fixture = window as any
    await fixture.__vrowzer__.updateFile('/main.js', fixture.__mainSource__(content))
  }, text)
  await expectPreviewText(page, text)
}

async function liveWorkerCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__liveWorkerCount__())
}

// Another origin, which has no Service Worker, for the outputs of app builds
const BUILT_ORIGIN = 'https://built.vrowzer.test'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain'
}

interface BuiltApp extends Fixture {
  pageErrors: string[]
  missingFiles: string[]
}

/**
 * Serves the outputs under `prefix` of another origin, as a static server does, and opens `path`
 * there in a new browser context.
 */
async function openBuiltApp(
  files: Record<string, SerializedContent>,
  prefix: string,
  path = ''
): Promise<BuiltApp> {
  const context = await browser.newContext()
  const missingFiles: string[] = []
  await context.route(`${BUILT_ORIGIN}/**`, route => {
    const { pathname } = new URL(route.request().url())
    let file = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : undefined
    if (file === '' || file?.endsWith('/')) {
      file += 'index.html'
    }
    const content = file === undefined ? undefined : files[file]
    if (content === undefined) {
      if (pathname !== '/favicon.ico') {
        missingFiles.push(pathname)
      }
      return route.fulfill({ status: 404, body: 'Not Found' })
    }
    return route.fulfill({
      status: 200,
      contentType: CONTENT_TYPES[extname(file!)] ?? 'application/octet-stream',
      body: typeof content === 'string' ? content : Buffer.from(content.bytes)
    })
  })
  const page = await context.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(`${BUILT_ORIGIN}${prefix}${path}`)
  return { context, page, pageErrors, missingFiles }
}

function findFile(files: Record<string, SerializedContent>, pattern: RegExp): string {
  const file = Object.keys(files).find(name => pattern.test(name))
  if (file === undefined) {
    throw new Error(`No output matches ${pattern}: ${Object.keys(files).join(', ')}`)
  }
  return file
}

function text(files: Record<string, SerializedContent>, file: string): string {
  const content = files[file]
  if (typeof content !== 'string') {
    throw new Error(`${file} is not a text output`)
  }
  return content
}

beforeAll(async () => {
  await build({ root: FIXTURE_DIR, logLevel: 'silent' })
  server = await preview({
    root: FIXTURE_DIR,
    logLevel: 'silent',
    preview: { port: 0, strictPort: false }
  })
  const address = server.httpServer?.address()
  if (typeof address !== 'object' || !address) {
    throw new Error('Failed to get build integration server address')
  }
  origin = `http://localhost:${address.port}`
  browser = await chromium.launch({ headless: true })
}, 180_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
  for (const dir of outputDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('vrowzer.build()', () => {
  test('builds a library that runs in Node, with a new build Worker each time', async () => {
    const { context, page } = await openFixture()
    try {
      const { files, warnings } = await expectBuilt(page, LIBRARY_OPTIONS)

      expect(Object.keys(files)).toEqual(
        expect.arrayContaining(['my-lib.js', 'my-lib.js.map', 'my-lib.css'])
      )
      expect(Object.keys(files).some(file => /^lazy-[\w-]+\.js$/.test(file))).toBe(true)
      expect(files['my-lib.css']).toContain('.lib-title')
      expect(files['my-lib.js']).not.toContain('tree-shaken-away')
      expect(Array.isArray(warnings)).toBe(true)

      const lib = await importLibrary(files, 'my-lib.js')
      expect(lib.default('vrowzer')).toBe('Hello, vrowzer')
      expect(lib.add(1, 2)).toBe(3)
      expect(lib.version).toBe('1.2.3')
      expect(await lib.loadLazy()).toBe('lazy-chunk-value')
      expect(lib.logoUrl).toMatch(/^data:image\/svg\+xml/)
      expect([lib.mode, lib.prod, lib.dev]).toEqual(['production', true, false])
      expect(lib.flag).toBe('on')
      // The plugins of the Worker config, bundled for production
      expect(lib.markerTransforms).toBe(1)
      expect(lib.markerNodeEnv).toBe('production')

      // The next build gets new plugin instances in a new build Worker
      const again = await importLibrary(
        (await expectBuilt(page, LIBRARY_OPTIONS)).files,
        'my-lib.js'
      )
      expect(again.markerTransforms).toBe(1)
      expect(again.markerInstance).not.toBe(lib.markerInstance)

      // Each build terminates its build Worker: only the Web Worker of the preview stays
      expect(await liveWorkerCount(page)).toBe(1)
      expect(await page.evaluate(() => (window as any).__createdWorkerCount__())).toBe(3)
      await expectPreviewUpdates(page, 'preview after builds')
    } finally {
      await context.close()
    }
  })

  test('builds into one file, and with and without minification', async () => {
    const { context, page } = await openFixture()
    try {
      const single = await expectBuilt(page, {
        define: LIBRARY_OPTIONS.define,
        build: {
          lib: { entry: '/src/index.ts' },
          minify: false,
          rolldownOptions: { output: { codeSplitting: false } }
        }
      })
      expect(Object.keys(single.files).filter(file => file.endsWith('.js'))).toEqual(['my-lib.js'])
      expect(single.files['my-lib.js']).toContain('lazy-chunk-value')
      expect(Object.keys(single.files).some(file => file.endsWith('.map'))).toBe(false)

      const plain = await expectBuilt(page, {
        define: LIBRARY_OPTIONS.define,
        build: { lib: { entry: '/src/index.ts' }, minify: false, sourcemap: false }
      })
      const minified = await expectBuilt(page, {
        define: LIBRARY_OPTIONS.define,
        build: { lib: { entry: '/src/index.ts' } }
      })
      expect(plain.files['my-lib.js']).toContain('function add(a, b)')
      expect((minified.files['my-lib.js'] as string).length).toBeLessThan(
        (plain.files['my-lib.js'] as string).length
      )
      expect((await importLibrary(minified.files, 'my-lib.js')).add(2, 3)).toBe(5)
    } finally {
      await context.close()
    }
  })

  test('builds the files as they are when build() is called', async () => {
    const { context, page } = await openFixture()
    try {
      const outcome = await page.evaluate(async options => {
        const fixture = window as any
        const building = fixture.__runBuild__(options)
        await fixture.__vrowzer__.updateFile(
          '/src/math.ts',
          'export function add(a: number, b: number): number { return a - b }\n'
        )
        return building
      }, LIBRARY_OPTIONS)
      expect(outcome.ok).toBe(true)
      expect((await importLibrary(outcome.files, 'my-lib.js')).add(1, 2)).toBe(3)

      // Added, updated and deleted files reach the next build
      await page.evaluate(async () => {
        const vrowzer = (window as any).__vrowzer__
        await vrowzer.addFile('/src/extra.ts', "export const extra = 'added'\n")
        await vrowzer.deleteFile('/src/lazy.ts')
        await vrowzer.updateFile(
          '/src/index.ts',
          "export { add } from './math'\nexport { extra } from './extra'\n"
        )
      })
      const next = await expectBuilt(page, LIBRARY_OPTIONS)
      const lib = await importLibrary(next.files, 'my-lib.js')
      expect(lib.add(1, 2)).toBe(-1)
      expect(lib.extra).toBe('added')
      expect(Object.keys(next.files).some(file => file.startsWith('lazy-'))).toBe(false)
    } finally {
      await context.close()
    }
  })

  test('reports a syntax error, and builds again once it is fixed', async () => {
    const { context, page } = await openFixture()
    try {
      await writeFile(page, '/src/math.ts', 'export const broken = ;\n')
      const error = await expectBuildError(page, LIBRARY_OPTIONS)

      expect(error.isBuildError).toBe(true)
      expect(error.name).toBe('VrowzerBuildError')
      expect(error.message).toMatch(/^\[Vrowzer\] build\(\) failed: /)
      // The transform of TypeScript reports it
      expect(error.errors[0]).toMatchObject({
        id: '/src/math.ts',
        plugin: expect.stringContaining('transform'),
        loc: { line: 1 },
        message: expect.stringContaining('Unexpected token')
      })
      // No ANSI colors
      expect(error.errors[0]!.message).not.toContain(String.fromCharCode(27))

      await writeFile(page, '/src/math.ts', 'export const add = (a: number, b: number) => a + b\n')
      await expectBuilt(page, LIBRARY_OPTIONS)
      await expectPreviewUpdates(page, 'preview after a failed build')
    } finally {
      await context.close()
    }
  })

  test('rejects a build while another one is running', async () => {
    const { context, page } = await openFixture()
    try {
      const [first, second] = await page.evaluate(async options => {
        const run = (window as any).__runBuild__
        const firstBuild = run(options)
        const secondBuild = run(options)
        return Promise.all([firstBuild, secondBuild])
      }, LIBRARY_OPTIONS)

      expect(first.ok).toBe(true)
      expect(second).toMatchObject({
        ok: false,
        error: { isBuildError: false, message: expect.stringContaining('already running') }
      })
    } finally {
      await context.close()
    }
  })

  test('times out, and builds again with a new build Worker', async () => {
    const { context, page } = await openFixture({ buildTimeout: 5000 })
    try {
      await writeFile(
        page,
        '/src/index.ts',
        `export const hang = 'HANG_BUILD'\n${await indexSource(page)}`
      )
      const error = await expectBuildError(page, LIBRARY_OPTIONS)
      expect(error).toMatchObject({
        isBuildError: false,
        message: '[Vrowzer] build() timed out after 5000ms'
      })
      expect(await liveWorkerCount(page)).toBe(1)
      await expectPreviewUpdates(page, 'preview after a timeout')

      await writeFile(page, '/src/index.ts', await indexSource(page))
      await expectBuilt(page, LIBRARY_OPTIONS)
      expect(await liveWorkerCount(page)).toBe(1)
    } finally {
      await context.close()
    }
  })

  test('rejects with the reason of the signal, and terminates the build Worker', async () => {
    const { context, page } = await openFixture()
    try {
      await writeFile(
        page,
        '/src/index.ts',
        `export const hang = 'HANG_BUILD'\n${await indexSource(page)}`
      )
      const outcome = await page.evaluate(async options => {
        const controller = new AbortController()
        const building = (window as any).__vrowzer__.build({
          ...options,
          signal: controller.signal
        })
        await new Promise(resolve => setTimeout(resolve, 500))
        controller.abort(new Error('stopped by the test'))
        return building.then(
          () => 'resolved',
          (error: Error) => error.message
        )
      }, LIBRARY_OPTIONS)

      expect(outcome).toBe('stopped by the test')
      expect(await liveWorkerCount(page)).toBe(1)
    } finally {
      await context.close()
    }
  })

  test('rejects a running build on dispose()', async () => {
    const { context, page } = await openFixture()
    try {
      await writeFile(
        page,
        '/src/index.ts',
        `export const hang = 'HANG_BUILD'\n${await indexSource(page)}`
      )
      const outcome = await page.evaluate(async options => {
        const vrowzer = (window as any).__vrowzer__
        const building = vrowzer.build(options).then(
          () => 'resolved',
          (error: Error) => error.message
        )
        await new Promise(resolve => setTimeout(resolve, 500))
        await vrowzer.dispose()
        const after = await vrowzer.build(options).then(
          () => 'resolved',
          (error: Error) => error.message
        )
        return { during: await building, after }
      }, LIBRARY_OPTIONS)

      expect(outcome).toEqual({
        during: '[Vrowzer] build() was cancelled by dispose()',
        after: '[Vrowzer] build() cannot be called after dispose()'
      })
      expect(await liveWorkerCount(page)).toBe(0)
    } finally {
      await context.close()
    }
  })

  test('runs short builds one after another, pacing the build Workers', async () => {
    // Each closed build Worker takes about 2 seconds to stop. Without the pacing, the WebAssembly of
    // a new build Worker stopped starting at about the twelfth short build in a row.
    const { context, page } = await openFixture({ buildTimeout: 30_000 })
    try {
      const outcomes = await page.evaluate(async options => {
        const run = (window as any).__runBuild__
        const results: boolean[] = []
        for (let index = 0; index < 12; index++) {
          results.push((await run(options)).ok)
        }
        return results
      }, LIBRARY_OPTIONS)

      expect(outcomes).toEqual(Array.from({ length: 12 }, () => true))
      await expectPreviewUpdates(page, 'preview after many builds')
    } finally {
      await context.close()
    }
  }, 120_000)

  test('releases the Workers that a build Worker starts', async () => {
    const { context, page } = await openFixture()
    try {
      const baseline = page.workers().length
      await expectBuilt(page, LIBRARY_OPTIONS)
      await expectBuilt(page, LIBRARY_OPTIONS)

      // page.workers() also lists the threads of rolldown in the build Worker
      await expect.poll(() => page.workers().length, { timeout: 10_000 }).toBe(baseline)
    } finally {
      await context.close()
    }
  })

  test.each([
    [{ build: { rolldownOptions: { input: '/src/index.ts' } } }, 'build.rolldownOptions.input'],
    [
      { build: { rolldownOptions: { input: ['/index.html', '/nested/index.html'] } } },
      'build.rolldownOptions.input'
    ],
    [{ build: { lib: { entry: '/src/index.ts', formats: ['umd'] } } }, 'build.lib.formats'],
    [{ build: { lib: { entry: '/src/index.ts' }, cssMinify: true } }, 'build.cssMinify']
  ])('rejects options that the browser build does not support (%j)', async (options, option) => {
    const { context, page } = await openFixture()
    try {
      const error = await expectBuildError(page, options)

      expect(error.isBuildError).toBe(true)
      expect(error.errors).toEqual([
        expect.objectContaining({
          code: 'VROWZER_UNSUPPORTED_OPTION',
          message: expect.stringContaining(`[vrowzer] ${option}:`)
        })
      ])
    } finally {
      await context.close()
    }
  })
})

describe('vrowzer.build() of HTML apps', () => {
  test.each([
    ['/', '/'],
    ['/app/', '/app/'],
    // A relative base works under any path
    ['./', '/sub/dir/']
  ])(
    'builds an app with base %j that runs at %s of another origin without the Service Worker',
    async (base, prefix) => {
      const { context, page } = await openFixture({}, 'app')
      try {
        const { files } = await expectBuilt(page, { base })
        const binaries: { big: number[]; photo: number[] } = await page.evaluate(
          () => (window as any).__appBinaries__
        )
        // Nothing of the dev server: the HMR client, the preview URLs and the Service Worker
        const code = Object.values(files)
          .filter(content => typeof content === 'string')
          .join('\n')
        expect(code).not.toContain('/@vite/client')
        expect(code).not.toContain('import.meta.hot')
        expect(code).not.toMatch(/\/preview\/[\da-f]{12}\//)
        expect(code).not.toContain('serviceWorker')

        const app = await openBuiltApp(files, prefix)
        try {
          await expect
            .poll(() => app.page.evaluate(() => document.body.dataset.lazy ?? ''), {
              timeout: 15_000
            })
            .toBe('lazy ok')
          const state = await app.page.evaluate(async () => {
            const bytes = async (url: string) =>
              Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()))
            const element = document.querySelector('#app') as HTMLElement
            const style = getComputedStyle(element)
            const { bigUrl, photoUrl, message } = document.body.dataset
            return {
              text: element.textContent,
              color: style.color,
              fontWeight: style.fontWeight,
              background: style.backgroundColor,
              small: (document.querySelector('#small') as HTMLImageElement).src,
              big: await bytes((document.querySelector('#big') as HTMLImageElement).src),
              bigUrl: await bytes(bigUrl!),
              photo: await bytes(photoUrl!),
              message,
              robots: await (await fetch(new URL('robots.txt', document.baseURI))).text(),
              controller: navigator.serviceWorker.controller,
              registrations: (await navigator.serviceWorker.getRegistrations()).length
            }
          })

          expect(state.text).toBe('app ok')
          // The CSS of the HTML, of the entry, and of the lazy chunk
          expect(state.color).toBe('rgb(0, 128, 0)')
          expect(state.fontWeight).toBe('700')
          expect(state.background).toBe('rgb(255, 255, 0)')
          // A small SVG is inlined. The images keep their bytes.
          expect(state.small).toMatch(/^data:image\/svg\+xml,/)
          expect(state.big).toEqual(binaries.big)
          expect(state.bigUrl).toEqual(binaries.big)
          expect(state.photo).toEqual(binaries.photo)
          expect(state.message).toBe('Hello from a text file\n')
          expect(state.robots).toBe('User-agent: *\n')
          expect(state.controller).toBeNull()
          expect(state.registrations).toBe(0)
          expect(app.pageErrors).toEqual([])
          // Every URL of the outputs is under the prefix
          expect(app.missingFiles).toEqual([])
        } finally {
          await app.context.close()
        }
      } finally {
        await context.close()
      }
    },
    60_000
  )

  test('rewrites the HTML, and splits and preloads the chunks, with source maps', async () => {
    const { context, page } = await openFixture({}, 'app')
    try {
      const { files } = await expectBuilt(page, { build: { minify: false, sourcemap: true } })

      const entry = findFile(files, /^assets\/index-[\w-]+\.js$/)
      const css = findFile(files, /^assets\/index-[\w-]+\.css$/)
      const lazy = findFile(files, /^assets\/lazy-[\w-]+\.js$/)
      const lazyCss = findFile(files, /^assets\/lazy-[\w-]+\.css$/)
      const big = findFile(files, /^assets\/big-[\w-]+\.png$/)
      findFile(files, /^assets\/photo-[\w-]+\.png$/)
      expect(files['robots.txt']).toBe('User-agent: *\n')

      const html = text(files, 'index.html')
      expect(html).toContain(`<script type="module" crossorigin src="/${entry}"></script>`)
      expect(html).toContain(`<link rel="stylesheet" crossorigin href="/${css}">`)
      expect(html).toContain(`<img id="big" src="/${big}" />`)
      expect(html).not.toContain('/src/')
      // The global CSS and the CSS of the entry go into one file
      expect(text(files, css)).toContain('rgb(0, 128, 0)')
      expect(text(files, css)).toContain('font-weight: 700')
      expect(text(files, lazy)).toContain('lazy ok')
      expect(text(files, lazyCss)).toContain('rgb(255, 255, 0)')

      // The entry preloads the lazy chunk with its CSS, and has the module preload polyfill
      const entryCode = text(files, entry)
      expect(entryCode).toContain('__vitePreload(')
      expect(entryCode).toContain(JSON.stringify(lazyCss))
      expect(entryCode).toContain('relList.supports("modulepreload")')

      for (const file of [entry, lazy]) {
        expect(text(files, file)).toContain(
          `//# sourceMappingURL=${file.slice('assets/'.length)}.map`
        )
        const map = JSON.parse(text(files, `${file}.map`))
        expect(
          map.sources.some(
            (source: string) => source.endsWith('src/main.ts') || source.endsWith('src/lazy.ts')
          )
        ).toBe(true)
      }
    } finally {
      await context.close()
    }
  })

  test('builds a nested HTML entry', async () => {
    const { context, page } = await openFixture({}, 'app')
    try {
      const { files } = await expectBuilt(page, {
        build: { rolldownOptions: { input: '/nested/index.html' } }
      })
      expect(Object.keys(files)).toContain('nested/index.html')
      expect(Object.keys(files)).not.toContain('index.html')

      const app = await openBuiltApp(files, '/', 'nested/')
      try {
        await expect
          .poll(() => app.page.evaluate(() => document.querySelector('#app')?.textContent ?? ''), {
            timeout: 15_000
          })
          .toBe('nested ok')
        expect(
          await app.page.evaluate(
            () => getComputedStyle(document.querySelector('#app') as HTMLElement).color
          )
        ).toBe('rgb(0, 128, 0)')
        expect(app.pageErrors).toEqual([])
        expect(app.missingFiles).toEqual([])
      } finally {
        await app.context.close()
      }
    } finally {
      await context.close()
    }
  })

  test('builds the default /index.html of the runtime', async () => {
    // The library has no /index.html, so ready() gives it the default one, which loads /main.js
    const { context, page } = await openFixture()
    try {
      const { files } = await expectBuilt(page, {})
      expect(text(files, 'index.html')).toContain('<title>Preview</title>')

      const app = await openBuiltApp(files, '/')
      try {
        await expect
          .poll(() => app.page.evaluate(() => document.querySelector('#app')?.textContent ?? ''), {
            timeout: 15_000
          })
          .toBe('preview v1')
        expect(app.pageErrors).toEqual([])
      } finally {
        await app.context.close()
      }
      await expectPreviewUpdates(page, 'preview after an app build')
    } finally {
      await context.close()
    }
  })
})

async function indexSource(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__indexSource__)
}
