/**
 * @vrowzer/fs E2E Tests
 *
 * Tests filesystem operations in a real browser environment using Vite dev server.
 */

import { chromium } from '@playwright/test'
import { getPort } from 'get-port-please'
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = dirname(__dirname)

let BASE_URL: string
let serverProcess: ChildProcess
let browser: Browser

// Start Vite dev server and wait for it to be ready
async function startDevServer(options: {
  cwd: string
  port?: number
  signal?: AbortSignal
}): Promise<{ url: string; process: ChildProcess }> {
  const { cwd, port: preferredPort = 5173, signal } = options

  const port = await getPort({ port: preferredPort })
  const url = `http://localhost:${port}`

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason as Error)
      return
    }

    const childProcess = spawn('npx', ['vite', '--port', String(port)], {
      cwd,
      stdio: 'pipe'
    })

    let stderrOutput = ''
    let settled = false

    const cleanup = () => {
      settled = true
      signal?.removeEventListener('abort', onAbort)
      clearInterval(pollId)
    }

    const onAbort = () => {
      if (settled) {
        return
      }
      cleanup()
      childProcess.kill()
      reject(
        (signal!.reason ?? new Error(`Aborted${stderrOutput ? `: ${stderrOutput}` : ''}`)) as Error
      )
    }

    signal?.addEventListener('abort', onAbort)

    childProcess.on('error', err => {
      if (settled) {
        return
      }
      cleanup()
      reject(err)
    })

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    childProcess.on('exit', code => {
      if (settled) {
        return
      }
      if (code !== null && code !== 0) {
        cleanup()
        reject(
          new Error(`Process exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`)
        )
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const pollId = setInterval(async () => {
      if (settled) {
        return
      }
      try {
        const res = await fetch(url)
        if (res.ok) {
          cleanup()
          resolve({ url, process: childProcess })
        }
      } catch {
        // Server not ready yet, keep polling
      }
    }, 100)
  })
}

describe('@vrowzer/fs E2E', () => {
  let context: BrowserContext
  let page: Page

  beforeAll(async () => {
    // Start Vite dev server
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort(new Error('Server start timeout'))
    }, 30000)

    try {
      const server = await startDevServer({
        cwd: packageDir,
        signal: abortController.signal
      })
      BASE_URL = server.url
      serverProcess = server.process
    } finally {
      clearTimeout(timeout)
    }

    // Launch browser
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    page = await context.newPage()
  })

  afterAll(async () => {
    await page?.close()
    await context?.close()
    await browser?.close()
    serverProcess?.kill()
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
