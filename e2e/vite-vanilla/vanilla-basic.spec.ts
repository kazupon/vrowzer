import { describe, expect, test } from 'vitest'
import {
  isBuild,
  iframeInnerText,
  iframeTextContent,
  page,
  updateFile,
  waitForIframeSelector,
  waitForIframeText
} from '~utils'

describe('vanilla-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('preview iframe renders content', async () => {
    await waitForIframeText('count is')
    const text = await iframeInnerText()
    expect(text).toContain('count is')
  })

  test('preview iframe shows YAML data', async () => {
    const text = await iframeInnerText()
    expect(text).toContain('Hello from YAML')
  })

  test('HMR - update file changes preview', async () => {
    if (isBuild) {return}

    await updateFile(
      '/main.ts',
      `
document.querySelector('#app')!.innerHTML = '<h1>HMR Updated</h1>'
if (import.meta.hot) { import.meta.hot.accept() }
`
    )

    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('h1')?.textContent === 'HMR Updated'
      },
      { timeout: 10000 }
    )
  })
})
