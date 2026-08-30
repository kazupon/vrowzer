import { chromium } from '@playwright/test'
import { V_SW_VERSION } from '@vrowzer/service-worker/protocols'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, createServer, preview } from 'vite'
import { expect, test } from 'vite-plus/test'

import type { Browser, BrowserContext, Page } from '@playwright/test'
import type { PreviewServer, ViteDevServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, 'custom-base')
const HOST_BASE = '/app/'
const PREVIEW_BASE = '/app/__preview__/'
const PREVIEW_MODULE = `${PREVIEW_BASE}main.js`
const PREVIEW_TEXT = 'Custom base preview works'
const SERVICE_WORKER_SCOPE = '/app/'
const SERVICE_WORKER_VERSION = 'app-v2'
const SERVICE_WORKER_VERSION_QUERY = 'vrowzer-version'
const SERVICE_WORKER_VERSION_DEFINE = '__VROWZER_INTERNAL_SERVICE_WORKER_VERSION__'

type TestMode = 'development' | 'build'
type TestServer = PreviewServer | ViteDevServer

async function startServer(mode: TestMode): Promise<TestServer> {
  if (mode === 'build') {
    await build({ root: FIXTURE_DIR, logLevel: 'silent' })
    return preview({
      root: FIXTURE_DIR,
      logLevel: 'silent',
      preview: { port: 0, strictPort: false }
    })
  }

  const server = await createServer({
    root: FIXTURE_DIR,
    logLevel: 'silent',
    server: { port: 0, strictPort: false }
  })
  await server.listen()
  return server
}

function getServerOrigin(server: TestServer): string {
  const address = server.httpServer?.address()
  if (typeof address !== 'object' || !address) {
    throw new Error('Failed to get custom base integration server address')
  }
  return `http://localhost:${address.port}`
}

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const text = document.getElementById('status')?.textContent ?? ''
      return text === 'Ready' || text.startsWith('Error') || text.startsWith('Failed')
    },
    undefined,
    { timeout: 60_000 }
  )
  expect(await page.textContent('#status')).toBe('Ready')
}

async function expectPreviewContent(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const iframe = document.querySelector('#preview-container iframe') as HTMLIFrameElement
          return iframe?.contentDocument?.body?.innerText ?? ''
        }),
      { timeout: 15_000 }
    )
    .toContain(PREVIEW_TEXT)

  const response = await page.evaluate(async previewBase => {
    const result = await fetch(previewBase)
    return { status: result.status, body: await result.text() }
  }, PREVIEW_BASE)
  expect(response.status).toBe(200)
  expect(response.body).toContain('Custom base preview')
  expect(response.body).not.toContain('Waiting for Service Worker...')

  const moduleResponse = await page.evaluate(async previewModule => {
    const result = await fetch(previewModule)
    return { status: result.status, body: await result.text() }
  }, PREVIEW_MODULE)
  expect(moduleResponse.status).toBe(200)
  expect(moduleResponse.body).toContain(PREVIEW_TEXT)
}

async function expectServiceWorkerRegistration(page: Page, mode: TestMode): Promise<void> {
  const registration = await page.evaluate(async scope => {
    const result = await navigator.serviceWorker.getRegistration(scope)
    const worker = result?.active ?? result?.waiting ?? result?.installing
    if (!result || !worker) {
      return undefined
    }
    return { scope: result.scope, scriptURL: worker.scriptURL }
  }, SERVICE_WORKER_SCOPE)

  if (!registration) {
    throw new Error(`No Service Worker registration found for ${SERVICE_WORKER_SCOPE}`)
  }

  expect(new URL(registration.scope).pathname).toBe(SERVICE_WORKER_SCOPE)
  const scriptURL = new URL(registration.scriptURL)
  expect(scriptURL.searchParams.get(SERVICE_WORKER_VERSION_QUERY)).toBe(SERVICE_WORKER_VERSION)
  if (mode === 'development') {
    expect(scriptURL.searchParams.get('sw')).toBe('service_worker_file')
  }

  const response = await fetch(registration.scriptURL)
  expect(response.status).toBe(200)
  expect(response.headers.get('Service-Worker-Allowed')).toBe(SERVICE_WORKER_SCOPE)
  const source = await response.text()
  expect(source).toContain(SERVICE_WORKER_VERSION)
  expect(source).not.toContain(SERVICE_WORKER_VERSION_DEFINE)

  const versionResponse = await page.evaluate(
    async ({ messageType, scope }) => {
      const result = await navigator.serviceWorker.getRegistration(scope)
      const worker = result?.active ?? result?.waiting ?? result?.installing
      if (!worker) {
        throw new Error(`No Service Worker found for ${scope}`)
      }

      const channel = new MessageChannel()
      return new Promise<{ type: string; version: string }>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer)
          channel.port1.onmessage = null
          channel.port1.onmessageerror = null
          channel.port1.close()
          channel.port2.close()
        }
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error(`Service Worker ${messageType} response timed out`))
        }, 5_000)

        channel.port1.onmessage = event => {
          cleanup()
          resolve(event.data)
        }
        channel.port1.onmessageerror = () => {
          cleanup()
          reject(new Error(`Service Worker ${messageType} response could not be decoded`))
        }
        channel.port1.start()
        worker.postMessage({ type: messageType }, [channel.port2])
      })
    },
    { messageType: V_SW_VERSION, scope: SERVICE_WORKER_SCOPE }
  )
  expect(versionResponse).toEqual({ type: V_SW_VERSION, version: SERVICE_WORKER_VERSION })
}

async function runScenario(mode: TestMode): Promise<void> {
  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let server: TestServer | undefined
  const logs: string[] = []

  try {
    server = await startServer(mode)
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    const page = await context.newPage()
    page.on('console', message => logs.push(`[console:${message.type()}] ${message.text()}`))
    page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`))

    await page.goto(`${getServerOrigin(server)}${HOST_BASE}`)
    await waitForReady(page)
    await expectPreviewContent(page)
    await expectServiceWorkerRegistration(page, mode)

    await page.reload()
    await waitForReady(page)
    await expectPreviewContent(page)
    await expectServiceWorkerRegistration(page, mode)

    expect(logs.join('\n')).not.toMatch(
      /\[pageerror\]|serviceWorkerVersion .*does not match|Service Worker (?:listen\(\) did not complete|registration error)/
    )
  } catch (error) {
    throw new Error(`Custom base ${mode} scenario failed\n${logs.join('\n')}`, { cause: error })
  } finally {
    await context?.close()
    await browser?.close()
    await server?.close()
  }
}

test('supports a custom base in development', () => runScenario('development'), 120_000)
test('supports a custom base in build', () => runScenario('build'), 120_000)
