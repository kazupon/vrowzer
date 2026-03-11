import { describe, expect, test } from 'vitest'
import { setupHost } from '../helpers/setup.ts'
import { isBuild } from '../helpers/test-utils.ts'

const ctx = setupHost(import.meta.dirname)

describe('svelte-basic', () => {
  test('page shows Ready status', async () => {
    const status = await ctx.page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Svelte component renders correctly', async () => {
    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument
          ?.querySelector('h1')
          ?.textContent?.includes('Vrowser + Svelte')
      },
      { timeout: 30000 }
    )
    const text = await ctx.page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('Vrowser + Svelte')
    expect(text).toContain('count is')
  })

  test('Svelte HMR - component change', async () => {
    if (isBuild) {
      return
    }

    await ctx.page.evaluate(() => {
      ;(window as any).__vrowser__.updateFile(
        '/Counter.svelte',
        `<script lang="ts">
  let count: number = $state(0)
  const increment = () => {
    count += 1
  }
</script>

<button onclick={increment}>
  clicks: {count}
</button>`
      )
    })

    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('button')?.textContent?.includes('clicks:')
      },
      { timeout: 10000 }
    )
  })
})
