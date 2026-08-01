/**
 * @vrowzer/fs E2E Tests
 *
 * Tests filesystem operations in a real browser environment using Vite dev server.
 */

import { chromium } from '@playwright/test'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { ViteDevServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = dirname(__dirname)

let BASE_URL: string
let server: ViteDevServer
let browser: Browser

async function startDevServer(): Promise<{ url: string; server: ViteDevServer }> {
  const server = await createServer({
    root: packageDir,
    server: {
      port: 0,
      strictPort: false
    }
  })
  await server.listen()

  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    await server.close()
    throw new Error('Failed to get Vite dev server address')
  }

  return { url: `http://localhost:${address.port}`, server }
}

describe('@vrowzer/fs E2E', () => {
  let context: BrowserContext
  let page: Page

  beforeAll(async () => {
    const devServer = await startDevServer()
    BASE_URL = devServer.url
    server = devServer.server

    // Launch browser
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    page = await context.newPage()
  })

  afterAll(async () => {
    await page?.close()
    await context?.close()
    await browser?.close()
    await server?.close()
  })

  it('can import and use fs module in browser', async () => {
    // Capture console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto(`${BASE_URL}/integration/test.html`)

    // Wait for modules to load
    try {
      await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
        timeout: 15000
      })
    } catch {
      console.error('Browser errors:', errors)
      throw new Error(`Page did not become ready. Errors: ${errors.join(', ')}`)
    }

    const result = await page.evaluate(() => {
      const { vol, writeFileSync, readFileSync } = window.fs
      vol.reset()
      writeFileSync('/test.txt', 'browser test')
      return readFileSync('/test.txt', 'utf8')
    })

    expect(result).toBe('browser test')
  })

  it('promises API works in browser', async () => {
    await page.goto(`${BASE_URL}/integration/test.html`)

    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(async () => {
      const { vol } = window.fs
      const { writeFile, readFile } = window.fsPromises
      vol.reset()
      await writeFile('/async.txt', 'async content')
      return await readFile('/async.txt', 'utf8')
    })

    expect(result).toBe('async content')
  })

  it('glob works in browser', async () => {
    await page.goto(`${BASE_URL}/integration/test.html`)

    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(() => {
      const { vol, writeFileSync, globSync } = window.fs
      vol.reset()
      vol.mkdirSync('/src', { recursive: true })
      writeFileSync('/src/a.ts', 'a')
      writeFileSync('/src/b.ts', 'b')
      writeFileSync('/src/c.js', 'c')
      return globSync('/src/*.ts')
    })

    expect(result).toHaveLength(2)
    expect(result).toContain('/src/a.ts')
    expect(result).toContain('/src/b.ts')
  })
})
