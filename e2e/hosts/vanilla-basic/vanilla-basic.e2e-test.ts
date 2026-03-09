import { describe, expect, test } from 'vitest'
import { setupHost } from '../../helpers/setup'
import { isBuild } from '../../helpers/test-utils'

const ctx = setupHost(import.meta.dirname)

describe('vanilla-basic', () => {
  test('page shows Ready status', async () => {
    const status = await ctx.page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('preview iframe renders content', async () => {
    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.body?.innerText?.includes('count is')
      },
      { timeout: 30000 }
    )
    const text = await ctx.page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('count is')
  })

  test('preview iframe shows YAML data', async () => {
    const text = await ctx.page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('Hello from YAML')
  })

  test('HMR - update file changes preview', async () => {
    if (isBuild) {return}

    await ctx.page.evaluate(() => {
      ;(window as any).__vrowser__.updateFile(
        '/main.ts',
        `
document.querySelector('#app')!.innerHTML = '<h1>HMR Updated</h1>'
if (import.meta.hot) { import.meta.hot.accept() }
`
      )
    })

    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('h1')?.textContent === 'HMR Updated'
      },
      { timeout: 10000 }
    )
  })
})
