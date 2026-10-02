import { parseAst } from 'rolldown/parseAst'
import { afterAll, describe, expect, test, vi } from 'vite-plus/test'

// NOTE(kazupon): assetImportMetaUrl.ts imports the build code, which loads rolldown from the browser
// build (`@vrowzer/rolldown`). The unit tests run in Node, so they use the Node build of the same
// rolldown version.
vi.mock('@vrowzer/rolldown', () => import('rolldown'))
vi.mock('@vrowzer/rolldown/experimental', () => import('rolldown/experimental'))
vi.mock('@vrowzer/rolldown/parseAst', () => import('rolldown/parseAst'))
vi.mock('@vrowzer/rolldown/utils', () => import('rolldown/utils'))

import { PartialEnvironment } from '../baseEnvironment'
import { resolveConfig } from '../config'
import { assetImportMetaUrlPlugin } from './assetImportMetaUrl'

// Ported from upstream Vite (`packages/vite/src/node/__tests__/plugins/assetImportMetaUrl.spec.ts`).
// NOTE(kazupon): `parseAst` comes from rolldown, as the fork does not depend on rollup

// NOTE(kazupon): the `describe` below resolves the config while the tests are collected, before
// `beforeAll()`, so stub the flag here
vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)

afterAll(() => {
  vi.unstubAllGlobals()
})

async function createAssetImportMetaurlPluginTransform() {
  const config = await resolveConfig({ configFile: false }, 'serve')
  const instance = assetImportMetaUrlPlugin(config)
  const environment = new PartialEnvironment('client', config)

  return async (code: string) => {
    // @ts-expect-error transform.handler should exist
    const result = await instance.transform.handler.call(
      { environment, parse: parseAst },
      code,
      'foo.ts',
    )
    return result?.code || result
  }
}

describe('assetImportMetaUrlPlugin', async () => {
  const transform = await createAssetImportMetaurlPluginTransform()

  test('variable between /', async () => {
    expect(
      await transform('new URL(`./foo/${dir}/index.js`, import.meta.url)'),
    ).toMatchInlineSnapshot(
      `"new URL((import.meta.glob("./foo/*/index.js", {"eager":true,"import":"default","query":"?url"}))[\`./foo/\${dir}/index.js\`], import.meta.url)"`,
    )
  })

  test('variable before non-/', async () => {
    expect(
      await transform('new URL(`./foo/${dir}.js`, import.meta.url)'),
    ).toMatchInlineSnapshot(
      `"new URL((import.meta.glob("./foo/*.js", {"eager":true,"import":"default","query":"?url"}))[\`./foo/\${dir}.js\`], import.meta.url)"`,
    )
  })

  test('two variables', async () => {
    expect(
      await transform('new URL(`./foo/${dir}${file}.js`, import.meta.url)'),
    ).toMatchInlineSnapshot(
      `"new URL((import.meta.glob("./foo/*.js", {"eager":true,"import":"default","query":"?url"}))[\`./foo/\${dir}\${file}.js\`], import.meta.url)"`,
    )
  })

  test('two variables between /', async () => {
    expect(
      await transform(
        'new URL(`./foo/${dir}${dir2}/index.js`, import.meta.url)',
      ),
    ).toMatchInlineSnapshot(
      `"new URL((import.meta.glob("./foo/*/index.js", {"eager":true,"import":"default","query":"?url"}))[\`./foo/\${dir}\${dir2}/index.js\`], import.meta.url)"`,
    )
  })

  test('ignore starting with a variable', async () => {
    expect(
      await transform('new URL(`${file}.js`, import.meta.url)'),
    ).toMatchInlineSnapshot(`"new URL(\`\${file}.js\`, import.meta.url)"`)
  })
})
