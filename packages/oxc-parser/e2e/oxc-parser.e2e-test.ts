/**
 * @vrowser/oxc-parser E2E Tests
 *
 * Tests parsing operations in a real browser environment using Vite dev server.
 */

import { chromium } from '@playwright/test'
import { getPort } from 'get-port-please'
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageDir = dirname(__dirname)

let BASE_URL: string
let serverProcess: ChildProcess
let browser: Browser

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
      if (settled) return
      cleanup()
      childProcess.kill()
      reject(
        (signal!.reason ?? new Error(`Aborted${stderrOutput ? `: ${stderrOutput}` : ''}`)) as Error
      )
    }

    signal?.addEventListener('abort', onAbort)

    childProcess.on('error', err => {
      if (settled) return
      cleanup()
      reject(err)
    })

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    childProcess.on('exit', code => {
      if (settled) return
      if (code !== null && code !== 0) {
        cleanup()
        reject(
          new Error(`Process exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`)
        )
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- for testing
    const pollId = setInterval(async () => {
      if (settled) return
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

describe('@vrowser/oxc-parser E2E', () => {
  let context: BrowserContext
  let page: Page

  beforeAll(async () => {
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

  it('initializes WASM and parseSync works', async () => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto(`${BASE_URL}/e2e/test.html`)

    try {
      await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
        timeout: 15000
      })
    } catch {
      console.error('Browser errors:', errors)
      throw new Error(`Page did not become ready. Errors: ${errors.join(', ')}`)
    }

    const result = await page.evaluate(() => {
      const r = window.oxcParser.parseSync('test.js', 'const x = 1;')
      return {
        type: r.program.type,
        bodyLength: r.program.body.length,
        bodyType: r.program.body[0]!.type,
        errorsLength: r.errors.length
      }
    })

    expect(result.type).toBe('Program')
    expect(result.bodyLength).toBe(1)
    expect(result.bodyType).toBe('VariableDeclaration')
    expect(result.errorsLength).toBe(0)
  })

  it('parses TypeScript', async () => {
    await page.goto(`${BASE_URL}/e2e/test.html`)
    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(() => {
      const r = window.oxcParser.parseSync('test.ts', 'const x: number = 1;')
      return {
        type: r.program.type,
        errorsLength: r.errors.length
      }
    })

    expect(result.type).toBe('Program')
    expect(result.errorsLength).toBe(0)
  })

  it('parses JSX', async () => {
    await page.goto(`${BASE_URL}/e2e/test.html`)
    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(() => {
      const r = window.oxcParser.parseSync('test.jsx', '<div>Hello</div>')
      return {
        type: r.program.type,
        bodyType: r.program.body[0]!.type
      }
    })

    expect(result.type).toBe('Program')
    expect(result.bodyType).toBe('ExpressionStatement')
  })

  it('returns module info for import/export', async () => {
    await page.goto(`${BASE_URL}/e2e/test.html`)
    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(() => {
      const r = window.oxcParser.parseSync(
        'test.js',
        "import { foo } from 'bar'; export const x = 1;"
      )
      return {
        hasModuleSyntax: r.module.hasModuleSyntax,
        staticImportsLength: r.module.staticImports.length,
        moduleRequest: r.module.staticImports[0]!.moduleRequest.value,
        staticExportsLength: r.module.staticExports.length
      }
    })

    expect(result.hasModuleSyntax).toBe(true)
    expect(result.staticImportsLength).toBe(1)
    expect(result.moduleRequest).toBe('bar')
    expect(result.staticExportsLength).toBe(1)
  })

  it('returns comments', async () => {
    await page.goto(`${BASE_URL}/e2e/test.html`)
    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(() => {
      const r = window.oxcParser.parseSync(
        'test.js',
        '// line comment\n/* block comment */\nconst x = 1;'
      )
      return {
        commentsLength: r.comments.length,
        types: r.comments.map((c: { type: string }) => c.type)
      }
    })

    expect(result.commentsLength).toBeGreaterThanOrEqual(2)
    expect(result.types).toContain('Line')
    expect(result.types).toContain('Block')
  })

  it('returns errors for invalid syntax', async () => {
    await page.goto(`${BASE_URL}/e2e/test.html`)
    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(() => {
      const r = window.oxcParser.parseSync('test.js', 'const = 1;')
      return {
        errorsLength: r.errors.length,
        severity: r.errors[0]!.severity
      }
    })

    expect(result.errorsLength).toBeGreaterThan(0)
    expect(result.severity).toBe('Error')
  })

  it('async parse works', async () => {
    await page.goto(`${BASE_URL}/e2e/test.html`)
    await page.waitForFunction(() => document.getElementById('status')?.textContent === 'ready', {
      timeout: 15000
    })

    const result = await page.evaluate(async () => {
      const r = await window.oxcParser.parse('test.js', 'const x = 1;')
      return {
        type: r.program.type,
        errorsLength: r.errors.length
      }
    })

    expect(result.type).toBe('Program')
    expect(result.errorsLength).toBe(0)
  })
})
