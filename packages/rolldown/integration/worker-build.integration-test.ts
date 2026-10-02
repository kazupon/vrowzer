/**
 * SPIKE (#36): runs rolldown in a dedicated module Worker and records timings and memory.
 *
 * The measurements are written to SPIKE_OUT (JSON) for the notes; the assertions only check that
 * the builds work.
 */

import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { copyFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, expect, test } from 'vite-plus/test'
import { createStaticServer } from './utils/server.ts'

import type { Browser, CDPSession, Page } from '@playwright/test'
import type { StaticServer } from './utils/server.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground-worker')
const OUTPUT_DIR = join(__dirname, '.output-worker')
const SPIKE_OUT = process.env.SPIKE_OUT ?? join(__dirname, '.output-worker', 'spike-result.json')

let browser: Browser
let browserCdp: CDPSession
let server: StaticServer

beforeAll(async () => {
  await build({
    root: PLAYGROUND_DIR,
    base: '/',
    logLevel: 'warn',
    build: {
      outDir: OUTPUT_DIR,
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
      rollupOptions: { input: join(PLAYGROUND_DIR, 'index.html') }
    }
  })
  const distDir = join(__dirname, '..', 'dist')
  copyFileSync(join(distDir, 'worker.js'), join(OUTPUT_DIR, 'worker.js'))
  copyFileSync(
    join(distDir, 'rolldown-binding.wasm32-wasi.wasm'),
    join(OUTPUT_DIR, 'rolldown-binding.wasm32-wasi.wasm')
  )
  browser = await chromium.launch({ args: ['--enable-blink-features=ForceEagerMeasureMemory'] })
  browserCdp = await browser.newBrowserCDPSession()
  server = await createStaticServer(OUTPUT_DIR)
})

afterAll(async () => {
  await server?.close()
  await browser?.close()
})

async function rendererRssKiB(): Promise<number> {
  const { processInfo } = (await browserCdp.send('SystemInfo.getProcessInfo')) as {
    processInfo: { type: string; id: number }[]
  }
  const pids = processInfo.filter(p => p.type === 'renderer').map(p => p.id)
  if (pids.length === 0) {
    return -1
  }
  const out = execFileSync('ps', ['-o', 'rss=', '-p', pids.join(',')], { encoding: 'utf8' })
  return out
    .split('\n')
    .map(line => Number(line.trim()))
    .filter(n => Number.isFinite(n) && n > 0)
    .reduce((a, b) => a + b, 0)
}

async function metrics(page: Page) {
  const uaMemory = await Promise.race([
    page.evaluate(() => (window as any).spike.measureMemory()),
    new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 15000))
  ])
  return {
    rendererRssKiB: await rendererRssKiB(),
    workers: page.workers().length,
    uaMemory
  }
}

test('rolldown bundles inside a dedicated module Worker', async () => {
  const page = await browser.newPage()
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  await page.goto(server.url)
  await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready')

  const result: Record<string, unknown> = {}
  result.baseline = await metrics(page)

  const ready = await page.evaluate(() => (window as any).spike.createWorker())
  result.ready = ready
  // Let the thread pool settle
  await page.waitForTimeout(500)
  result.afterReady = await metrics(page)

  const split = await page.evaluate(() => (window as any).spike.build({ output: 'split' }))
  const single = await page.evaluate(() => (window as any).spike.build({ output: 'single' }))
  const plain = await page.evaluate(() => (window as any).spike.build({ output: 'plain' }))
  const repeats = []
  for (let i = 0; i < 5; i++) {
    const r = await page.evaluate(() => (window as any).spike.build({ output: 'split' }))
    repeats.push({ timings: r.timings, roundTrip: r.roundTrip })
  }
  // A changed project in the same Worker: the previous files must not leak
  const changed = await page.evaluate(() =>
    (window as any).spike.build({
      output: 'plain',
      files: { '/src/index.ts': "export const only = 'changed-project'\n" }
    })
  )
  result.builds = {
    split: {
      timings: split.timings,
      roundTrip: split.roundTrip,
      files: split.files.map((f: any) => f.fileName)
    },
    single: {
      timings: single.timings,
      roundTrip: single.roundTrip,
      files: single.files.map((f: any) => f.fileName)
    },
    plain: {
      timings: plain.timings,
      roundTrip: plain.roundTrip,
      files: plain.files.map((f: any) => f.fileName)
    },
    repeats,
    changed: { files: changed.files.map((f: any) => f.fileName) }
  }
  result.afterBuilds = await metrics(page)

  await page.evaluate(() => (window as any).spike.terminate())
  await page.waitForTimeout(1500)
  result.afterTerminate = await metrics(page)
  result.errors = errors
  writeFileSync(SPIKE_OUT, JSON.stringify(result, null, 2))

  // split: entry + lazy chunk + source maps
  const splitChunks = split.files.filter((f: any) => f.type === 'chunk')
  expect(splitChunks.length).toBeGreaterThanOrEqual(2)
  expect(split.files.some((f: any) => f.fileName.endsWith('.map'))).toBe(true)
  expect(splitChunks.find((f: any) => f.isEntry).code).not.toContain('tree-shaken-away')
  // single: one chunk with the lazy module inlined
  const singleChunks = single.files.filter((f: any) => f.type === 'chunk')
  expect(singleChunks).toHaveLength(1)
  expect(singleChunks[0].code).toContain('lazy-chunk-value')
  // plain: not minified
  expect(plain.files[0].code).toContain('function add(a, b)')
  // changed project: only the new file
  expect(changed.files).toHaveLength(1)
  expect(changed.files[0].code).toContain('changed-project')
  expect(changed.files[0].code).not.toContain('loadLazy')
  expect(errors).toEqual([])
}, 180_000)
