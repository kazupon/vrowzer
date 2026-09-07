import { describe, expect, test } from 'vite-plus/test'
import { browserErrors, iframeTextContent, page, updateFile } from '~utils'

describe('extract: false', () => {
  test('runs the host plugin only on the host', async () => {
    expect(await page.textContent('#status')).toBe('Ready')
    expect(await page.textContent('#host-marker')).toBe('host-plugin-applied')
    await expect
      .poll(() => iframeTextContent('#preview-marker'), { timeout: 30_000 })
      .toBe('__EXTRACT_PLUGIN_MARKER__')
  })

  test('preserves Worker aliases and HMR without reloading the preview', async () => {
    await expect
      .poll(() => iframeTextContent('#alias-value'), { timeout: 30_000 })
      .toBe('alias-initial')

    const bootToken = await page.evaluate(
      () => document.querySelector('iframe')?.contentDocument?.body.dataset.bootToken
    )
    expect(bootToken).toBeTypeOf('string')

    await updateFile('/vendor/preview-lib.js', `export const value = 'alias-updated'`)
    await expect
      .poll(() => iframeTextContent('#alias-value'), { timeout: 30_000 })
      .toBe('alias-updated')
    expect(
      await page.evaluate(
        () => document.querySelector('iframe')?.contentDocument?.body.dataset.bootToken
      )
    ).toBe(bootToken)
    expect(browserErrors).toEqual([])
  })
})
