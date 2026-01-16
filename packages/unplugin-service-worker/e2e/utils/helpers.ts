import { rm, mkdir } from 'node:fs/promises'

import type { Page } from '@playwright/test'
import type { SvcWorkerControllerState } from '@vrowser/service-worker/controller'

/**
 * Clean up service workers from the page
 */
export async function cleanupServiceWorkers(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(r => r.unregister()))
  })
}

/**
 * Wait for status element to show specific value
 */
export async function waitForStatus(page: Page, status: string, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    (expectedStatus: string) => document.getElementById('status')?.textContent === expectedStatus,
    status,
    { timeout }
  )
}

/**
 * Get controller state from the page
 */
export async function getControllerState(page: Page): Promise<SvcWorkerControllerState | null> {
  return page.evaluate(() => {
    return window.testState?.controller?.state ?? null
  })
}

/**
 * Get recorded states from the test page
 */
export async function getRecordedStates(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return window.testState?.states ?? []
  })
}

/**
 * Get recorded events from the test page
 */
export async function getRecordedEvents(
  page: Page
): Promise<Array<{ type: string; data?: unknown }>> {
  return page.evaluate(() => {
    return window.testState?.events ?? []
  })
}

/**
 * Wait for the page to be controlled by Service Worker
 */
export async function waitForServiceWorkerController(page: Page, timeout = 15000): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
    timeout
  })
}

/**
 * Check if page is controlled by Service Worker (non-blocking)
 */
export async function isPageControlled(page: Page): Promise<boolean> {
  return page.evaluate(() => navigator.serviceWorker.controller !== null)
}

/**
 * Fetch the test API endpoint from the Service Worker
 */
export async function fetchServiceWorkerApi(page: Page): Promise<{
  version: string
  sessionCount: number
  suspended: boolean
}> {
  await waitForServiceWorkerController(page)
  return page.evaluate(async () => {
    const response = await fetch('/api/test')
    return response.json() as Promise<{
      version: string
      sessionCount: number
      suspended: boolean
    }>
  })
}

/**
 * Call controller method from the page
 */
export async function callControllerMethod(
  page: Page,
  method: string,
  ...args: unknown[]
): Promise<unknown> {
  return page.evaluate(
    ({ method, args }) => {
      const controller = window.testState?.controller
      if (!controller) {
        throw new Error('Controller not available')
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- for testing
      return (controller as any)[method](...args)
    },
    { method, args }
  )
}

/**
 * Clean and recreate output directory
 */
export async function prepareOutputDir(outputDir: string): Promise<void> {
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })
}

/**
 * Get the Service Worker script URL from the page
 */
export async function getSwScriptUrl(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return window.testState?.controller?.scriptURL ?? null
  })
}
