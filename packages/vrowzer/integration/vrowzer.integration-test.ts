/**
 * Vrowzer E2E Tests
 *
 * Verifies that the vrowzer library works end-to-end in a browser environment.
 * Builds a test playground with Vite + Vrowzer, starts vite preview server,
 * then uses Playwright to verify preview initialization, file operations, and HMR.
 */

import { chromium } from '@playwright/test'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

import type { Browser, Page } from '@playwright/test'
import type { PreviewServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYGROUND_DIR = join(__dirname, 'playground')

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'
const debug = (...args: unknown[]) => E2E_DEBUG && console.log('[E2E]', ...args)

let browser: Browser
let server: PreviewServer
let page: Page
let serverUrl: string
let pageConsoleLogs: string[] = []

interface PreviewResponse {
  status: number
  body: string
}

async function addPreviewFiles(files: Record<string, string>): Promise<void> {
  await page.evaluate(filesToAdd => {
    const vrowzer = (window as any).__vrowzer__
    for (const [filePath, content] of Object.entries(filesToAdd)) {
      vrowzer.addFile(filePath, content)
    }
  }, files)
}

async function fetchFromPreview(requestPath: string): Promise<PreviewResponse> {
  return page.evaluate(async path => {
    const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement | null
    if (!iframe?.contentWindow) {
      throw new Error('Preview iframe is not available')
    }

    const response = await iframe.contentWindow.fetch(`/__preview__${path}`)
    return {
      status: response.status,
      body: await response.text()
    }
  }, requestPath)
}

async function waitForPreviewResponse(
  requestPath: string,
  expectedStatus: number
): Promise<PreviewResponse> {
  let response: PreviewResponse | undefined

  await expect
    .poll(
      async () => {
        try {
          response = await fetchFromPreview(requestPath)
          return response.status
        } catch {
          return undefined
        }
      },
      { timeout: 10_000 }
    )
    .toBe(expectedStatus)

  if (!response) {
    throw new Error(`No preview response for ${requestPath}`)
  }
  return response
}

beforeAll(async () => {
  debug('Building playground...')
  execSync('npx vite build', { cwd: PLAYGROUND_DIR, stdio: E2E_DEBUG ? 'inherit' : 'pipe' })
  debug('Build complete')

  server = await preview({
    root: PLAYGROUND_DIR,
    preview: {
      port: 0,
      strictPort: false,
      headers: {
        'Service-Worker-Allowed': '/',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless'
      }
    }
  })

  const address = server.httpServer.address()
  if (typeof address === 'object' && address) {
    serverUrl = `http://localhost:${address.port}`
  } else {
    throw new Error('Failed to get preview server address')
  }
  debug('Preview server started at', serverUrl)

  browser = await chromium.launch({ headless: true })
  debug('Browser launched')

  page = await browser.newPage()

  // Collect console logs for debugging. Always keep them in memory so failures in
  // non-debug mode still include the browser-side ready() error.
  page.on('console', msg => {
    const log = `[browser ${msg.type()}] ${msg.text()}`
    pageConsoleLogs.push(log)
    debug(log)
  })
  page.on('pageerror', err => {
    const log = `[browser error] ${err.message}`
    pageConsoleLogs.push(log)
    debug(log)
  })

  await page.goto(serverUrl)

  // Wait for ready() to complete (status becomes "Ready" or error).
  try {
    await page.waitForFunction(
      () => {
        const text = document.getElementById('status')?.textContent ?? ''
        return text === 'Ready' || text.startsWith('Error') || text.startsWith('Failed')
      },
      undefined,
      { timeout: 60000 }
    )
  } catch (error) {
    const status = await page.textContent('#status')
    throw new Error(
      `Timed out waiting for vrowzer playground to finish initialization; status=${JSON.stringify(status)}\n${pageConsoleLogs.join('\n')}`,
      { cause: error }
    )
  }

  const status = await page.textContent('#status')
  debug('Status:', status)

  if (status !== 'Ready') {
    throw new Error(
      `Expected vrowzer playground to become Ready, got ${JSON.stringify(status)}\n${pageConsoleLogs.join('\n')}`
    )
  }
}, 120000)

afterAll(async () => {
  await page?.close()
  await browser?.close()
  server?.close()
  debug('Cleanup complete')
})

describe('Vrowzer E2E', () => {
  describe('initialization', () => {
    test('page loads and shows ready status', async () => {
      expect(await page.textContent('#status')).toBe('Ready')
    })

    test('ready() resolves and status shows Ready', async () => {
      const status = await page.textContent('#status')
      debug('Final status:', status)
      expect(status).toBe('Ready')
    })

    test('mount() creates iframe in container', async () => {
      const iframe = await page.$('#preview-container iframe')
      expect(iframe).not.toBeNull()
    })

    test('iframe has credentialless attribute', async () => {
      const credentialless = await page.$eval('#preview-container iframe', el =>
        el.hasAttribute('credentialless')
      )
      expect(credentialless).toBe(true)
    })

    test('iframe has sandbox="allow-scripts allow-same-origin"', async () => {
      const sandbox = await page.$eval('#preview-container iframe', el =>
        el.getAttribute('sandbox')
      )
      expect(sandbox).toBe(
        'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
      )
    })

    test('preview content is rendered in iframe', async () => {
      // Wait for iframe content to load
      await page.waitForFunction(
        () => {
          const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement
          return iframe?.contentDocument?.body?.innerText?.includes('Hello from Vrowzer!')
        },
        undefined,
        { timeout: 30000 }
      )

      const text = await page.evaluate(() => {
        const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.body?.innerText
      })

      expect(text).toContain('Hello from Vrowzer!')
      expect(text).toContain('count: 0')
    }, 60000)
  })

  describe('file operations', () => {
    test('updateFile() triggers preview update', async () => {
      // Update main.js via vrowzer API
      await page.evaluate(() => {
        const vrowzer = (window as any).__vrowzer__
        vrowzer.updateFile(
          '/main.js',
          `
document.getElementById('app').innerHTML = '<h1>Updated!</h1><p id="result">1 + 1 = 2</p>'

if (import.meta.hot) {
  import.meta.hot.accept()
}
`
        )
      })

      // Wait for the update to reflect in the iframe
      await page.waitForFunction(
        () => {
          const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement
          return iframe?.contentDocument?.body?.innerText?.includes('Updated!')
        },
        undefined,
        { timeout: 15000 }
      )

      const text = await page.evaluate(() => {
        const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.body?.innerText
      })

      expect(text).toContain('Updated!')
      expect(text).toContain('1 + 1 = 2')
    }, 30000)
  })

  describe('Service Worker', () => {
    test('Service Worker is registered and active', async () => {
      const swState = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration('/')
        return registration?.active?.state
      })

      expect(swState).toBe('activated')
    })
  })

  describe('filesystem security', () => {
    const deniedFiles = {
      '/.env': 'ENV_SECRET_CANARY',
      '/.npmrc': 'NPMRC_SECRET_CANARY',
      '/.yarnrc.yml': 'YARNRC_SECRET_CANARY',
      '/secret.key': 'PRIVATE_KEY_SECRET_CANARY'
    }
    const staticCases = [
      {
        name: 'denies .npmrc through the static path',
        requestPath: '/.npmrc',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'denies .npmrc through the /@fs/ path',
        requestPath: '/@fs/.npmrc',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'denies .yarnrc.yml through the static path',
        requestPath: '/.yarnrc.yml',
        canary: deniedFiles['/.yarnrc.yml']
      },
      {
        name: 'denies .yarnrc.yml through the /@fs/ path',
        requestPath: '/@fs/.yarnrc.yml',
        canary: deniedFiles['/.yarnrc.yml']
      },
      {
        name: 'denies .key through the static path',
        requestPath: '/secret.key',
        canary: deniedFiles['/secret.key']
      },
      {
        name: 'denies .key through the /@fs/ path',
        requestPath: '/@fs/secret.key',
        canary: deniedFiles['/secret.key']
      }
    ]
    const transformQueryCases = [
      {
        name: 'raw query before import',
        filePath: '/.npmrc',
        query: '?raw&import',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'import before raw query',
        filePath: '/.npmrc',
        query: '?import&raw',
        canary: deniedFiles['/.npmrc']
      },
      {
        name: 'url query',
        filePath: '/.yarnrc.yml',
        query: '?url&import',
        canary: deniedFiles['/.yarnrc.yml']
      },
      {
        name: 'inline query',
        filePath: '/secret.key',
        query: '?inline&import',
        canary: deniedFiles['/secret.key']
      },
      {
        name: 'SVG-like query',
        filePath: '/.env',
        query: '?.svg?import',
        canary: deniedFiles['/.env']
      }
    ]
    const transformCases = [
      { name: 'the normal path', prefix: '' },
      { name: 'the /@fs/ path', prefix: '/@fs' }
    ].flatMap(({ name: routeName, prefix }) =>
      transformQueryCases.map(({ name, filePath, query, canary }) => ({
        name: `denies ${name} through ${routeName}`,
        requestPath: `${prefix}${filePath}${query}`,
        canary
      }))
    )

    beforeAll(async () => {
      await addPreviewFiles(deniedFiles)
    })

    test.each(staticCases)('$name', async ({ requestPath, canary }) => {
      const response = await waitForPreviewResponse(requestPath, 403)
      expect(response.body).toContain('403 Restricted')
      expect(response.body).not.toContain(canary)
    })

    test.each(transformCases)('$name', async ({ requestPath, canary }) => {
      const response = await waitForPreviewResponse(requestPath, 403)
      expect(response.body).toContain('403 Restricted')
      expect(response.body).not.toContain(canary)
    })
  })
})
