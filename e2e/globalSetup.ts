/**
 * Global E2E test setup for vrowzer.
 *
 * Launches a single shared Chromium browser server and provides its
 * WebSocket endpoint to all tests via vitest's provide/inject mechanism.
 */

import { chromium } from '@playwright/test'

import type { BrowserServer } from '@playwright/test'

let browserServer: BrowserServer

const E2E_DEBUG = process.env.E2E_DEBUG === '1' || process.env.E2E_DEBUG === 'true'

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
  const headless = !process.env.VITE_DEBUG_SERVE
  browserServer = await chromium.launchServer({ headless })
  const wsEndpoint = browserServer.wsEndpoint()
  provide('wsEndpoint', wsEndpoint)
  if (E2E_DEBUG) {console.log('[E2E] Browser server started:', wsEndpoint)}
}

export async function teardown() {
  await browserServer?.close()
  if (E2E_DEBUG) {console.log('[E2E] Browser server closed')}
}
