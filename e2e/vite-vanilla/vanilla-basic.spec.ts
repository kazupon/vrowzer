import { describe, expect, test } from 'vite-plus/test'
import {
  browserRequests,
  browserResponses,
  iframeInnerText,
  isBuild,
  isServe,
  page,
  updateFile
} from '~utils'

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

  test('serve mode loads the Worker transformer aggregate', () => {
    if (!isServe) {
      return
    }

    const paths = browserRequests.map(url => new URL(url).pathname)
    expect(paths.some(path => path.endsWith('/web-worker-transformer.js'))).toBe(true)
    expect(paths.some(path => path.endsWith('/transformer.js'))).toBe(false)
    expect(paths.some(path => path.includes('/transformer-chunks/'))).toBe(false)

    for (const fileName of ['rolldown-binding.wasm32-wasi.wasm', 'rolldown-worker.js']) {
      expect(
        browserResponses.some(
          response =>
            new URL(response.url).pathname.endsWith(`/${fileName}`) &&
            response.status >= 200 &&
            response.status < 400
        )
      ).toBe(true)
    }
  })

  test('build mode loads Rolldown assets from the host assets directory', () => {
    if (!isBuild) {
      return
    }

    for (const fileName of ['rolldown-binding.wasm32-wasi.wasm', 'rolldown-worker.js']) {
      const response = browserResponses.find(({ url }) =>
        new URL(url).pathname.endsWith(`/assets/${fileName}`)
      )
      expect(response?.status).toBeGreaterThanOrEqual(200)
      expect(response?.status).toBeLessThan(400)
    }
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
