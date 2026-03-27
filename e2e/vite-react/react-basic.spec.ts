import { describe, expect, test } from 'vitest'
import {
  isBuild,
  iframeInnerText,
  iframeTextContent,
  page,
  updateFile,
  waitForIframeSelector
} from '~utils'

describe('react-basic', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('React component renders correctly', async () => {
    await waitForIframeSelector('h1')
    const text = await iframeInnerText()
    expect(text).toContain('Vrowzer + React')
    expect(text).toContain('count is')
  })

  test('React HMR - component change', async () => {
    if (isBuild) {return}

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

    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        return iframe?.contentDocument?.querySelector('button')?.textContent?.includes('clicks:')
      },
      { timeout: 10000 }
    )
  })
})
