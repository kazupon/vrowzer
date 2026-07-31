import { describe, expect, test } from 'vite-plus/test'
import type { MinimalPluginContextWithoutEnvironment } from '../plugin'
import { postImportMapHook } from './html'

describe('postImportMapHook', () => {
  test('moves an import map before a non-self-closing modulepreload link', async () => {
    const html = `<!doctype html>
<html>
  <head>
    <link rel="modulepreload" href="/preloaded.js">
    <script type="importmap">
      {
        "imports": {
          "entry": "/entry.js"
        }
      }
    </script>
    <script type="module" src="/entry.js"></script>
  </head>
</html>`

    const result = await postImportMapHook().call(
      {} as MinimalPluginContextWithoutEnvironment,
      html,
      {
        path: '/index.html',
        filename: '/index.html',
      },
    )

    if (typeof result !== 'string') {
      throw new TypeError('Expected transformed HTML')
    }

    const importMapIndex = result.indexOf('<script type="importmap">')
    const modulePreloadIndex = result.indexOf('<link rel="modulepreload"')
    const moduleScriptIndex = result.indexOf('<script type="module"')

    expect(importMapIndex).toBeGreaterThanOrEqual(0)
    expect(modulePreloadIndex).toBeGreaterThanOrEqual(0)
    expect(moduleScriptIndex).toBeGreaterThanOrEqual(0)
    expect(importMapIndex).toBeLessThan(modulePreloadIndex)
    expect(modulePreloadIndex).toBeLessThan(moduleScriptIndex)
  })
})
