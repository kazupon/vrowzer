import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vite-plus/test'
import {
  browserErrors,
  browserResponses,
  iframeInnerText,
  iframeTextContent,
  page,
  updateFile,
  untilBrowserLogAfter
} from '~utils'

describe('dedicated Worker config', () => {
  test('uses React for the host and Svelte for a preview with a custom base', async () => {
    expect(await page.textContent('#status')).toBe('Ready')
    await expect.poll(() => page.textContent('#react-host')).toBe('React host: host define')
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Worker preview')
    expect(
      browserResponses.some(
        response => new URL(response.url).pathname === '/worker-preview/' && response.status === 200
      )
    ).toBe(true)
  })

  test('preserves compiler options, inline data, alias and define without importing host config', async () => {
    await expect.poll(() => iframeTextContent('#worker-define')).toBe('worker define')
    expect(await iframeTextContent('#worker-alias')).toBe('dedicated alias')
    expect(await iframeTextContent('#spacing')).toBe('before    after')
    expect(await iframeTextContent('#host-define')).toBe('undefined')
    expect(browserErrors).toEqual([])
  })

  test('updates the preview through HMR without reloading the iframe', async () => {
    await page.frameLocator('iframe').locator('#counter').click()
    expect(await iframeTextContent('#counter')).toBe('count: 1')
    const body = page.frameLocator('iframe').locator('body')
    await body.evaluate(element => {
      element.dataset.hmrMarker = 'before-update'
    })
    const source = readFileSync(new URL('./preview/App.svelte', import.meta.url), 'utf8')
    await untilBrowserLogAfter(
      () => updateFile('/App.svelte', source.replace('Worker preview', 'Updated worker preview')),
      '[vrowzer] hot updated: /App.svelte'
    )
    await expect
      .poll(() => iframeInnerText(), { timeout: 10000 })
      .toContain('Updated worker preview')
    expect(await body.getAttribute('data-hmr-marker')).toBe('before-update')
  })
})
