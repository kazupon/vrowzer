import { describe, expect, it } from 'vite-plus/test'
import { rewriteRolldownAssetUrls } from './rolldown.js'

describe('rewriteRolldownAssetUrls', () => {
  it('rebases package-relative Rolldown assets into the production chunk directory', () => {
    const code = [
      `new URL('../rolldown-binding.wasm32-wasi.wasm?__vrowzer_internal_asset=rolldown', import.meta.url)`,
      `new URL("../rolldown-worker.js?__vrowzer_internal_asset=rolldown", import.meta.url)`
    ].join('\n')

    expect(rewriteRolldownAssetUrls(code)).toBe(
      [
        `new URL('./rolldown-binding.wasm32-wasi.wasm?__vrowzer_internal_asset=rolldown', import.meta.url)`,
        `new URL("./rolldown-worker.js?__vrowzer_internal_asset=rolldown", import.meta.url)`
      ].join('\n')
    )
  })

  it('does not rewrite unmarked relative assets', () => {
    const code = `new URL('../rolldown-worker.js', import.meta.url)`

    expect(rewriteRolldownAssetUrls(code)).toBe(code)
  })
})
