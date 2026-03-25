import { describe, expect, test } from 'vitest'
import { setupHost } from '../helpers/setup.ts'
import { isBuild } from '../helpers/test-utils.ts'

const ctx = setupHost(import.meta.dirname)

describe('react-basic', () => {
  test('page shows Ready status', async () => {
    const status = await ctx.page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('React component renders correctly', async () => {
    await ctx.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument
          ?.querySelector('h1')
          ?.textContent?.includes('Vrowzer + React')
      },
      { timeout: 30000 }
    )
    const text = await ctx.page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.innerText ?? ''
    })
    expect(text).toContain('Vrowzer + React')
    expect(text).toContain('count is')
  })

  test('React HMR - component change', async () => {
    if (isBuild) {
      return
    }

    await ctx.page.evaluate(() => {
      ;(window as any).__vrowzer__.updateFile(
        '/App.tsx',
        `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  return (
    <>
      <h1>Vrowzer + React</h1>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>clicks: {count}</button>
      </div>
    </>
  )
}

export default App`
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
