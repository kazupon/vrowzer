/**
 * Vrowzer E2E Tests
 *
 * Verifies that the vrowzer library works end-to-end in a browser environment.
 * Builds a test playground with Vite + Vrowzer, starts vite preview server,
 * then uses Playwright to verify preview initialization, file operations, and HMR.
 */

import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
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

interface SourceMapPayload {
  sourcesContent?: (string | null)[]
  [key: string]: unknown
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

async function waitForPreviewBodyContaining(
  requestPath: string,
  expectedContent: string
): Promise<PreviewResponse> {
  let response: PreviewResponse | undefined

  await expect
    .poll(
      async () => {
        try {
          response = await fetchFromPreview(requestPath)
          return response.body
        } catch {
          return undefined
        }
      },
      { timeout: 10_000 }
    )
    .toContain(expectedContent)

  if (!response) {
    throw new Error(`No preview response for ${requestPath}`)
  }
  return response
}

function createInlineSourceMapComment(map: SourceMapPayload): string {
  return `//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(map))}`
}

function extractInlineSourceMap(code: string): SourceMapPayload {
  const matches = [
    ...code.matchAll(/sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/g)
  ]
  const encoded = matches.at(-1)?.[1]
  if (!encoded) {
    throw new Error('Response does not contain an inline source map')
  }
  return JSON.parse(atob(encoded)) as SourceMapPayload
}

beforeAll(async () => {
  debug('Building playground...')
  await build({
    root: PLAYGROUND_DIR,
    logLevel: E2E_DEBUG ? 'info' : 'silent'
  })
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
  await server?.close()
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

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              const text = iframe?.contentDocument?.body?.innerText
              return {
                updated: text?.includes('Updated!') ?? false,
                result: text?.includes('1 + 1 = 2') ?? false
              }
            }),
          { timeout: 15_000 }
        )
        .toEqual({ updated: true, result: true })
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

  describe('dependency sourcemap security', () => {
    const sourceCanary = 'PROJECT_SOURCE_SECRET_CANARY'
    const externalMapCanary = 'PROJECT_MAP_SECRET_CANARY'
    const inlineDependencyPath = '/node_modules/vrowzer-malicious-inline/index.js'
    const externalDependencyPath = '/node_modules/vrowzer-malicious-external/index.js'
    const inlineMap: SourceMapPayload = {
      version: 3,
      sources: ['../../project-secret.ts'],
      sourcesContent: [null],
      names: [],
      mappings: 'AAAA'
    }
    const externalMap: SourceMapPayload = {
      version: 3,
      sources: ['index.ts'],
      sourcesContent: [externalMapCanary],
      names: [],
      mappings: 'AAAA'
    }

    beforeAll(async () => {
      await addPreviewFiles({
        '/project-secret.ts': sourceCanary,
        '/project-secret.map': JSON.stringify(externalMap),
        '/node_modules/vrowzer-malicious-inline/package.json': JSON.stringify({
          name: 'vrowzer-malicious-inline',
          version: '0.0.0',
          type: 'module'
        }),
        [inlineDependencyPath]: [
          'export const value = "inline"',
          createInlineSourceMapComment(inlineMap)
        ].join('\n'),
        '/node_modules/vrowzer-malicious-external/package.json': JSON.stringify({
          name: 'vrowzer-malicious-external',
          version: '0.0.0',
          type: 'module'
        }),
        [externalDependencyPath]: [
          'export const value = "external"',
          '//# sourceMappingURL=../../project-secret.map'
        ].join('\n')
      })
    })

    test('does not inject package-external source content into an inline dependency map', async () => {
      await waitForPreviewBodyContaining('/project-secret.ts?raw&import', sourceCanary)

      const response = await waitForPreviewResponse(`${inlineDependencyPath}?import`, 200)
      const responseMap = extractInlineSourceMap(response.body)

      expect(responseMap.sourcesContent).toEqual([null])
      expect(JSON.stringify(responseMap)).not.toContain(sourceCanary)
    })

    test('does not load a package-external sourcemap file', async () => {
      await waitForPreviewBodyContaining('/project-secret.map', externalMapCanary)

      const response = await waitForPreviewResponse(`${externalDependencyPath}?import`, 200)
      const responseMap = extractInlineSourceMap(response.body)

      expect(JSON.stringify(responseMap)).not.toContain(externalMapCanary)
    })
  })

  describe('?raw sourcemaps', () => {
    test('does not inject a fallback sourcemap', async () => {
      const rawContent = ['first line', 'second line', 'third line', ''].join('\n')

      await addPreviewFiles({
        '/raw-sourcemap/content.txt': rawContent
      })

      const response = await waitForPreviewBodyContaining(
        '/raw-sourcemap/content.txt?raw&import',
        `export default ${JSON.stringify(rawContent)}`
      )

      expect(response.status).toBe(200)
      expect(response.body).not.toContain('sourceMappingURL=data:application/json;base64,')
    })
  })

  describe('trailing slash HTML paths', () => {
    test('pre-transforms relative modules from the trailing slash directory', async () => {
      await addPreviewFiles({
        '/trailing-slash-test.js': `
import warmupUrls from 'virtual:vrowzer-test-trailing-slash'
globalThis.__vrowzerTrailingSlashWarmupUrls = warmupUrls
`,
        '/trailing-slash/dir/filename.js': 'export const filename = true',
        '/trailing-slash/other.js': 'export const other = true'
      })

      await waitForPreviewBodyContaining(
        '/trailing-slash/dir/filename.js?import',
        'filename = true'
      )
      await waitForPreviewBodyContaining('/trailing-slash/other.js?import', 'other = true')

      await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        const iframeDocument = iframe?.contentDocument
        if (!iframeDocument) {
          throw new Error('Preview iframe is not available')
        }

        const script = iframeDocument.createElement('script')
        script.type = 'module'
        script.src = '/__preview__/trailing-slash-test.js'
        iframeDocument.head.append(script)
      })

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return (iframe?.contentWindow as any)?.__vrowzerTrailingSlashWarmupUrls
            }),
          { timeout: 15_000 }
        )
        .toBeTruthy()

      const warmupUrls = await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        return (iframe?.contentWindow as any)?.__vrowzerTrailingSlashWarmupUrls
      })

      expect(warmupUrls).toEqual(['/trailing-slash/dir/filename.js', '/trailing-slash/other.js'])
    })
  })

  describe('/@fs/ HTML proxy cache', () => {
    test('loads inline modules from /@fs/ and root HTML paths', async () => {
      const inlineModuleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HTML proxy</title>
  </head>
  <body>
    <script type="module">
      export const marker = 'inline proxy loaded'
    </script>
  </body>
</html>`

      await addPreviewFiles({
        '/fs-html-proxy-test.js': `
import proxyUrls from 'virtual:vrowzer-test-fs-html-proxy'

const results = {}
for (const [name, url] of Object.entries(proxyUrls)) {
  try {
    const module = await import(/* @vite-ignore */ url)
    results[name] = { marker: module.marker }
  } catch (error) {
    results[name] = {
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
globalThis.__vrowzerFsHtmlProxyResults = results
`,
        '/fs-html-proxy/fs.html': inlineModuleHtml,
        '/fs-html-proxy/root.html': inlineModuleHtml,
        '/fs-html-proxy/sentinel.js': 'export const sentinel = true'
      })

      await waitForPreviewBodyContaining('/fs-html-proxy/sentinel.js?import', 'sentinel = true')

      await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        const iframeDocument = iframe?.contentDocument
        if (!iframeDocument) {
          throw new Error('Preview iframe is not available')
        }

        const script = iframeDocument.createElement('script')
        script.type = 'module'
        script.src = '/__preview__/fs-html-proxy-test.js'
        iframeDocument.head.append(script)
      })

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const iframe = document.querySelector(
                '#preview-container iframe'
              ) as HTMLIFrameElement | null
              return (iframe?.contentWindow as any)?.__vrowzerFsHtmlProxyResults
            }),
          { timeout: 15_000 }
        )
        .toBeTruthy()

      const results = await page.evaluate(() => {
        const iframe = document.querySelector(
          '#preview-container iframe'
        ) as HTMLIFrameElement | null
        return (iframe?.contentWindow as any)?.__vrowzerFsHtmlProxyResults
      })

      expect(results).toEqual({
        fsPath: { marker: 'inline proxy loaded' },
        rootPath: { marker: 'inline proxy loaded' }
      })
    })
  })

  describe('PostCSS URL rewriting', () => {
    test('rewrites URLs injected by a OnceExit plugin', async () => {
      await addPreviewFiles({
        '/postcss-once-exit/entry.css': '@inject-url-once-exit;',
        '/postcss-once-exit/injected-source/injected.css': '',
        '/postcss-once-exit/injected-source/injected-bg.png': 'injected background',
        '/postcss-once-exit/sentinel.js': 'export const sentinel = true'
      })

      await waitForPreviewBodyContaining('/postcss-once-exit/sentinel.js?import', 'sentinel = true')

      const response = await waitForPreviewResponse('/postcss-once-exit/entry.css?direct', 200)

      expect(response.body).toContain('.inject-url-once-exit')
      expect(response.body).toContain('/postcss-once-exit/injected-source/injected-bg.png')
      expect(response.body).not.toContain('url(./injected-bg.png)')
    })
  })

  describe('CSS server.origin', () => {
    test('applies server.origin to public URLs', async () => {
      const expectedUrl = 'https://assets.vrowzer.test/__preview__/server-origin-icon.png'

      await addPreviewFiles({
        '/public/server-origin-icon.png': 'server origin icon',
        '/server-origin/entry.css':
          ".server-origin-public { background-image: url('/server-origin-icon.png'); }"
      })

      const response = await waitForPreviewBodyContaining(
        '/server-origin/entry.css?direct',
        expectedUrl
      )

      expect(response.status).toBe(200)
      expect(response.body).toContain(expectedUrl)
      expect(response.body).not.toContain("url('/__preview__/server-origin-icon.png')")
    })
  })
})
