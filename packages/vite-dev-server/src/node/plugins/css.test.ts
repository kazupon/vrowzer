import type { TransformPluginContext } from 'rolldown'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vite-plus/test'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteJsonPlugin: () => ({ name: 'vite:json' }),
  viteTransformPlugin: () => ({ name: 'native:transform' }),
}))
vi.mock('@vrowzer/rolldown/parseAst', () => ({
  parseAst: vi.fn<(...args: unknown[]) => unknown>(),
  parseAstAsync: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('lightningcss', () => {
  throw new Error('LightningCSS must remain unloaded')
})
vi.mock('esbuild', () => {
  throw new Error('esbuild must remain unloaded')
})

import { UnknownEnvironment } from '../baseEnvironment'
import { resolveConfig } from '../config'
import { getHash } from '../utils'
import { convertTargets, cssPlugin, cssPostPlugin } from './css'
import { htmlProxyResult } from './html'
import { getHookHandler } from './index'

beforeAll(() => {
  vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.restoreAllMocks()
  htmlProxyResult.clear()
})

describe('convertTargets', () => {
  test.each([
    { label: 'false', target: false },
    { label: 'esnext', target: 'esnext' },
    { label: 'esnext array', target: ['esnext'] },
    { label: 'empty array', target: [] },
    { label: 'non-browser targets', target: ['node24', 'hermes0.9', 'rhino1.7'] },
  ] satisfies { label: string; target: Parameters<typeof convertTargets>[0] }[])(
    'returns undefined for $label',
    ({ target }) => {
      expect(convertTargets(target)).toBeUndefined()
    },
  )

  test('keeps browser constraints alongside esnext', () => {
    expect(convertTargets(['esnext', 'chrome148'])).toEqual({ chrome: 0x94_00_00 })
  })

  test('keeps version mapping, browser aliases and the oldest constraint', () => {
    expect(convertTargets(['chrome120', 'chrome111', 'safari13.1', 'ios13', 'node24']))
      .toEqual({ chrome: 0x6f_00_00, safari: 0x0d_01_00, ios_saf: 0x0d_00_00 })
    expect(convertTargets('es2018')).toEqual({
      chrome: 4128768,
      edge: 5177344,
      firefox: 3801088,
      safari: 786432,
      ios_saf: 786432,
      opera: 3276800,
    })
  })

  test('caches undefined without repeating conversion', () => {
    const targets = ['esnext']
    const flatMap = vi.spyOn(targets, 'flatMap')
    expect(convertTargets(targets)).toBeUndefined()
    expect(convertTargets(targets)).toBeUndefined()
    expect(flatMap).toHaveBeenCalledOnce()
  })

  test('preserves the cached object for browser targets', () => {
    const targets = ['chrome111']
    const result = convertTargets(targets)
    expect(result).toEqual({ chrome: 0x6f_00_00 })
    expect(convertTargets(targets)).toBe(result)
  })

  test('still rejects unsupported targets', () => {
    expect(() => convertTargets('unknown1')).toThrow('Unsupported target "unknown1"')
  })
})

const htmlFile = '/project/index.html'
const proxyKey = `${getHash(htmlFile)}_0`
const styleId = `${htmlFile}?html-proxy&inline-css&index=0.css`

async function setup(
  command: 'serve' | 'build',
  cssMinify: false | 'esbuild' | 'lightningcss' = false,
) {
  const config = await resolveConfig({
    root: '/project',
    base: '/preview/',
    configFile: false,
    logLevel: 'silent',
    css: { postcss: { plugins: [] } },
    build: { cssMinify },
  }, command)
  const context = {
    environment: new UnknownEnvironment('client', config),
  } as unknown as TransformPluginContext
  const plugin = cssPostPlugin(config)
  return {
    config,
    context,
    transform: getHookHandler(plugin.transform!).bind(context),
  }
}

describe.each(['serve', 'build'] as const)('CSS HTML proxy (%s)', command => {
  test.each([false, 'esbuild', 'lightningcss'] as const)(
    'escapes style closing tags without minifying when cssMinify is %s',
    async cssMinify => {
      const { transform } = await setup(command, cssMinify)
      const css = '/* retained comment */\n.a::before { content: "</STYLE>"; color: red; }\n'
      expect(await transform(css, styleId)).toBe("export default ''")
      expect(htmlProxyResult.get(proxyKey)).toBe(
        '/* retained comment */\n.a::before { content: "<\\/style>"; color: red; }\n',
      )
    },
  )

  test('only escapes closing tags followed by an HTML tag delimiter', async () => {
    const { transform } = await setup(command)
    const delimiters = ['\t', '\n', '\f', '\r', ' ', '/', '>']
    const tokens = delimiters.map(delimiter => `</StYlE${delimiter}`)
    const nonTags = ['</stylesheet>', '</style-name>', '</style0>', '</style']
    await transform([...tokens, ...nonTags].join('|'), styleId)
    expect(htmlProxyResult.get(proxyKey)).toBe([
      ...delimiters.map(delimiter => `<\\/style${delimiter}`),
      ...nonTags,
    ].join('|'))
  })

  test('keeps style attribute quote escaping separate from style tag escaping', async () => {
    const { transform } = await setup(command, 'lightningcss')
    const id = `${htmlFile}?html-proxy&inline-css&style-attr&index=0.css`
    expect(await transform('content: "</style>"; color: red; ', id)).toBe("export default ''")
    expect(htmlProxyResult.get(proxyKey)).toBe('content: &quot;</style>&quot;; color: red; ')
  })

  test('keeps ordinary inline CSS as a JS string without HTML escaping or minification', async () => {
    const { config, context, transform } = await setup(command, 'esbuild')
    const pre = cssPlugin(config)
    await getHookHandler(pre.buildStart!).call(context, {} as never)
    try {
      const css = '/* retained */\n.a { content: "</style>"; color: red; }\n'
      const result = await transform(css, '/project/style.css?inline')
      const code = `export default ${JSON.stringify(css)}`
      const expected = command === 'serve'
        ? code
        : { code, map: { mappings: '' }, moduleSideEffects: false, moduleType: 'js' }
      expect(result).toEqual(expected)
      expect(htmlProxyResult.size).toBe(0)
    } finally {
      await getHookHandler(pre.buildEnd!).call(context)
    }
  })
})

test('keeps dev style tags on the direct CSS path and regular CSS on the HMR path', async () => {
  const { config, context, transform } = await setup('serve', 'lightningcss')
  const pre = cssPlugin(config)
  await getHookHandler(pre.buildStart!).call(context, {} as never)
  try {
    const css = '.a { color: red; }\n'
    expect(await transform(css, `${htmlFile}?html-proxy&direct&index=0.css`)).toBeNull()
    const result = await transform(css, '/project/style.css')
    expect(result).toMatchObject({
      code: expect.stringContaining('from "/preview/@vite/client"'),
      moduleType: 'js',
    })
    expect(result).toMatchObject({ code: expect.stringContaining('import.meta.hot.accept()') })
    expect(result).toMatchObject({ code: expect.stringContaining(JSON.stringify(css)) })
    expect(htmlProxyResult.size).toBe(0)
  } finally {
    await getHookHandler(pre.buildEnd!).call(context)
  }
})
