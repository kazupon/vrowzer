import { describe, expect, test } from 'vite-plus/test'
import { isBuild, iframeInnerText, page, updateFile } from '~utils'

describe('svelte-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('Svelte component renders correctly', async () => {
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Vrowzer + Svelte')
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('count is')
  })

  test('Svelte HMR - component change', async () => {
    if (isBuild) {
      return
    }

    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Vrowzer + Svelte')

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

    await expect.poll(() => iframeInnerText(), { timeout: 10000 }).toContain('clicks:')
  })
})
