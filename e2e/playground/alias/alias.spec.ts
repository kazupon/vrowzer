import { describe, expect, test } from 'vitest'
import { getColor, isBuild, page, updateFile } from '~utils'

async function getIframeTexts(...selectors: string[]): Promise<Record<string, string | null>> {
  return page.evaluate(sels => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    const doc = iframe?.contentDocument
    const result: Record<string, string | null> = {}
    for (const sel of sels) {
      result[sel] = doc?.querySelector(sel)?.textContent ?? null
    }
    return result
  }, selectors)
}

async function waitForTestComplete() {
  await page.waitForFunction(
    () => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      return iframe?.contentDocument?.body?.dataset?.testComplete === 'true'
    },
    { timeout: 30000 }
  )
}

describe('alias', () => {
  test('page shows Ready status', async () => {
    const status = await page.textContent('#status')
    expect(status).toBe('Ready')
  })

  test('fs', async () => {
    await waitForTestComplete()
    const texts = await getIframeTexts('.fs')
    expect(texts['.fs']).toMatch('[success] alias to fs path')
  })

  test('fs directory', async () => {
    const texts = await getIframeTexts('.fs-dir')
    expect(texts['.fs-dir']).toMatch('[success] alias to directory')
  })

  // Skipped: RegExp-based aliases are not supported in vrowzer because
  // VrowzerOptions.resolve is serialized via JSON.stringify to pass to the Worker,
  // and RegExp objects become {} when serialized.
  test.skip('regex', async () => {
    const texts = await getIframeTexts('.regex')
    expect(texts['.regex']).toMatch('[success] alias to directory via regex')
  })

  test('js via script src', async () => {
    const texts = await getIframeTexts('.from-script-src')
    expect(texts['.from-script-src']).toMatch('[success] from script src')
  })

  // Skipped: CSS link with aliased href (/@/test.css) is not resolved correctly
  // in vrowzer's preview iframe. The alias is applied to JS imports by the Worker's
  // Vite dev server, but <link> tags in HTML are processed by the iframe bootstrap
  // which fetches URLs relative to the preview base path without alias resolution.
  test.skip('css via link', async () => {
    expect(await getColor('body')).toBe('grey')
    if (isBuild) {
      return
    }
    await updateFile('/dir/test.css', 'body { color: red; }')
    await expect.poll(() => getColor('body')).toBe('red')
  })

  test('aliased module', async () => {
    const texts = await getIframeTexts('.aliased-module')
    expect(texts['.aliased-module']).toMatch('[success] aliased module')
  })

  // Skipped: RegExp-based aliases are not supported (see regex test above).
  test.skip('url conflict alias', async () => {
    const texts = await getIframeTexts('.url-conflict')
    expect(texts['.url-conflict']).toMatch('[success] url conflict alias')
  })

  test('custom resolver', async () => {
    const texts = await getIframeTexts('.custom-resolver')
    expect(texts['.custom-resolver']).toMatch('[success] alias to custom-resolver path')
  })

  // Skipped: Requires Vue dependency and optimized dep aliasing.
  // In vrowzer, deps are pre-bundled via vrowzer-manifest and not through
  // Vite's optimizer, so optimized dep aliasing is not applicable.
  test.skip('optimized dep', () => {})

  // Skipped: Requires @vitejs/test-resolve-linked workspace dependency
  // which is not available in vrowzer's e2e environment.
  test.skip('dependency', () => {})
})
