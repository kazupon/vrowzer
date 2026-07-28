import { describe, expect, test } from 'vite-plus/test'
import { isBuild, iframeInnerText, page, updateFile } from '~utils'

describe('react-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('React component renders correctly', async () => {
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Vrowzer + React')
    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('count is')
  })

  test('React HMR - component change', async () => {
    if (isBuild) {
      return
    }

    await expect.poll(() => iframeInnerText(), { timeout: 30000 }).toContain('Vrowzer + React')

    await updateFile(
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

    await expect.poll(() => iframeInnerText(), { timeout: 10000 }).toContain('clicks:')
  })
})
