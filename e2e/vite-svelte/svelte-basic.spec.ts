import { describe, expect, test } from 'vitest'
import {
  isBuild,
  iframeInnerText,
  iframeTextContent,
  page,
  updateFile,
  waitForIframeSelector
} from '~utils'

describe('svelte-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Svelte component renders correctly', async () => {
    await waitForIframeSelector('h1')
    const text = await iframeInnerText()
    expect(text).toContain('Vrowzer + Svelte')
    expect(text).toContain('count is')
  })

  test('Svelte HMR - component change', async () => {
    if (isBuild) {
      return
    }

    await updateFile(
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

    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('button')?.textContent?.includes('clicks:')
      },
      { timeout: 10000 }
    )
  })
})
