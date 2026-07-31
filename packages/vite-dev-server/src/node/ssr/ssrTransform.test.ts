import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('../plugins/json', () => ({
  isJSONRequest: (request: string) => /\.json(?:$|\?)/.test(request),
}))

import { ssrModuleExportsKey, ssrTransform } from './ssrTransform'

describe('ssrTransform JSON', () => {
  it('keeps the exported async contract', async () => {
    const source = 'export default {"answer":42}'
    const resultPromise = ssrTransform(source, null, '/data.json', source, {
      json: { stringify: true },
    })

    expect(resultPromise).toBeInstanceOf(Promise)
    await expect(resultPromise).resolves.toEqual({
      code: `${ssrModuleExportsKey}.default = {"answer":42}`,
      map: null,
      deps: [],
      dynamicDeps: [],
      ssr: true,
    })
  })
})
