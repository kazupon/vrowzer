import { describe, expect, it } from 'vite-plus/test'
import {
  isInternalRolldownAssetUrl,
  withInternalRolldownAssetQuery
} from './internalAssets'

describe('internal Rolldown assets', () => {
  it.each([
    'rolldown-binding.wasm32-wasi.wasm',
    'rolldown-worker.js'
  ])('marks %s for a network request', fileName => {
    const relativeUrl = withInternalRolldownAssetQuery(`./${fileName}`)

    expect(
      isInternalRolldownAssetUrl(
        new URL(relativeUrl, 'https://example.com/assets/entry.js').href
      )
    ).toBe(true)
  })

  it('does not bypass unmarked or unrelated requests', () => {
    expect(
      isInternalRolldownAssetUrl(
        'https://example.com/assets/rolldown-worker.js'
      )
    ).toBe(false)
    expect(
      isInternalRolldownAssetUrl(
        'https://example.com/assets/app.js?__vrowzer_internal_asset=rolldown'
      )
    ).toBe(false)
  })
})
