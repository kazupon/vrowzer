import { describe, expect, test } from 'vite-plus/test'
import { isBuild, iframeInnerText, page, updateFile } from '~utils'

describe('vanilla-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('preview iframe renders content', async () => {
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('count is')
  })

  test('preview iframe shows YAML data', async () => {
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Hello from YAML')
  })

  test('HMR - update file changes preview', async () => {
    if (isBuild) {
      return
    }

    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('count is')

    await updateFile(
      '/main.ts',
      `
document.querySelector('#app')!.innerHTML = '<h1>HMR Updated</h1>'
if (import.meta.hot) { import.meta.hot.accept() }
`
    )

    await expect.poll(() => iframeInnerText(), { timeout: 10000 }).toContain('HMR Updated')
  })
})
