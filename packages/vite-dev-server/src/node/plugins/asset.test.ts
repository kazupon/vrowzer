import { Buffer } from 'node:buffer'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { rolldown } from 'rolldown'
import type { NormalizedOutputOptions, PluginContext, RenderedChunk } from 'rolldown'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vite-plus/test'

vi.mock('@vrowzer/rolldown', () => ({ rolldown: vi.fn<(...args: unknown[]) => unknown>() }))
vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteJsonPlugin: () => ({ name: 'vite:json' }),
  viteTransformPlugin: () => ({ name: 'native:transform' }),
}))
vi.mock('@vrowzer/rolldown/parseAst', () => ({
  parseAst: vi.fn<(...args: unknown[]) => unknown>(),
  parseAstAsync: vi.fn<(...args: unknown[]) => unknown>(),
}))
vi.mock('@vrowzer/rolldown/utils', () => ({ transformSync: vi.fn<(...args: unknown[]) => unknown>() }))

import { BuildEnvironment } from '../build'
import { resolveConfig } from '../config'
import type { InlineConfig } from '../config'
import { ROLLUP_HOOKS } from '../constants'
import { DevEnvironment } from '../server/environment'
import { EnvironmentModuleNode } from '../server/moduleGraph'
import { injectQuery } from '../utils'
import { getHookHandler } from './index'
import { assetPlugin, fileToUrl, getAssetUrlPostfix, renderAssetUrlInJS, urlToBuiltUrl } from './asset'
import { cssPlugin, cssPostPlugin } from './css'

let root: string
let assetId: string
const assetContent = 'asset contents'
const outputName = 'assets/asset file.png'
const postfix = '?v=1#icon'
// Rolldown reference IDs are 22-character base64url strings with `-` replaced by `$`
const referenceId = 'asset$ref'.padEnd(22, '0')
const escapedReferenceId = referenceId.replace('$', '\\$')
const assetTokenRE = new RegExp(`^__VITE_ASSET__${escapedReferenceId}_([a-f\\d]{24})__$`)
const fileUrlExpressionRE = new RegExp(`import\\.meta\\.ROLLDOWN_FILE_URL_${escapedReferenceId}_([a-f\\d]{24})$`)

beforeAll(async () => {
  vi.stubGlobal('__VROWZER_SERVICE_WORKER__', false)
  root = await mkdtemp(path.join(tmpdir(), 'vrowzer-assets-'))
  assetId = path.join(root, 'asset file.png')
  await writeFile(assetId, assetContent)
  await mkdir(path.join(root, 'public'))
  await writeFile(path.join(root, 'public', 'public.png'), assetContent)
})

afterAll(async () => {
  vi.unstubAllGlobals()
  await rm(root, { recursive: true, force: true })
})

async function setup(base = '/preview/', command: 'build' | 'serve' = 'build', options: InlineConfig = {}) {
  const config = await resolveConfig({
    root,
    base,
    configFile: false,
    logLevel: 'silent',
    css: { postcss: { plugins: [] } },
    build: { cssMinify: false },
    ...options,
  }, command)
  const environment = command === 'build'
    ? new BuildEnvironment('client', config)
    : new DevEnvironment('client', config, { disableDepsOptimizer: true })
  const plugin = assetPlugin(config)
  const context = {
    environment,
    emitFile: vi.fn<PluginContext['emitFile']>(() => referenceId),
    getFileName: vi.fn<PluginContext['getFileName']>(() => outputName),
    getModuleInfo: vi.fn<PluginContext['getModuleInfo']>(() => null),
    addWatchFile: vi.fn<PluginContext['addWatchFile']>(),
  }
  const ctx = context as unknown as PluginContext
  await getHookHandler(plugin.buildStart!).call(ctx, {} as never)
  return { config, environment, plugin, context, ctx }
}

function createChunk(modules: RenderedChunk['modules'] = {}): RenderedChunk {
  return {
    fileName: 'assets/main.js',
    name: 'main',
    isEntry: true,
    exports: ['default'],
    modules,
    viteMetadata: { importedAssets: new Set(), importedCss: new Set() },
  } as RenderedChunk
}

describe('asset URL formats', () => {
  test('shares emitted assets across JS and text consumers and carries the postfix in URL metadata', async () => {
    const { plugin, environment, context, ctx } = await setup()
    const id = `${assetId}?no-inline&v=1#icon`
    const tokenUrlId = (await fileToUrl(ctx, id, 'string')).match(assetTokenRE)?.[1]
    expect(tokenUrlId).toBeDefined()
    expect(getAssetUrlPostfix(environment, tokenUrlId)).toBe(postfix)
    const expressionUrlId = (await fileToUrl(ctx, id, 'js')).match(fileUrlExpressionRE)?.[1]
    expect(expressionUrlId).toBeDefined()
    expect(getAssetUrlPostfix(environment, expressionUrlId)).toBe(postfix)
    const builtUrlId = (await urlToBuiltUrl(ctx, './asset file.png?no-inline&v=1#icon', path.join(root, 'main.js')))
      .match(assetTokenRE)?.[1]
    expect(getAssetUrlPostfix(environment, builtUrlId)).toBe(postfix)
    expect(context.emitFile).toHaveBeenCalledOnce()
    expect(context.emitFile).toHaveBeenCalledWith(expect.objectContaining({
      type: 'asset', name: 'asset file.png', originalFileName: 'asset file.png',
    }))
    const loaded = await getHookHandler(plugin.load!).call(ctx, `${assetId}?url&no-inline&v=1#icon`)
    expect(loaded).toMatchObject({
      code: expect.stringMatching(new RegExp(`^export default ${fileUrlExpressionRE.source}`)),
    })
    await getHookHandler(plugin.watchChange!).call(ctx, id, { event: 'update' })
    await fileToUrl(ctx, id, 'string')
    expect(context.emitFile).toHaveBeenCalledTimes(2)
  })

  test.each(['string', 'js'] as const)('keeps inline data URLs in %s format', async format => {
    const { context, ctx } = await setup()
    const url = `data:image/png;base64,${Buffer.from(assetContent).toString('base64')}`
    expect(await fileToUrl(ctx, `${assetId}?inline`, format)).toBe(format === 'js' ? JSON.stringify(url) : url)
    expect(context.emitFile).not.toHaveBeenCalled()
  })

  test.each(['string', 'js'] as const)('keeps public URLs separate from emitted references in %s format', async format => {
    const { context, ctx } = await setup()
    const text = await fileToUrl(ctx, '/public.png?v=1#icon', 'string')
    expect(text).toMatch(/^__VITE_PUBLIC_ASSET__[a-z\d]{8}__$/)
    expect(await fileToUrl(ctx, '/public.png?v=1#icon', format)).toBe(format === 'js' ? JSON.stringify(text) : text)
    expect(context.emitFile).not.toHaveBeenCalled()
  })

  test.each(['string', 'js'] as const)('keeps dev URLs in %s format', async format => {
    const { plugin, context, ctx } = await setup('/preview/', 'serve', { server: { origin: 'https://host.test' } })
    const url = `https://host.test/preview/asset file.png${postfix}`
    expect(await fileToUrl(ctx, `${assetId}${postfix}`, format))
      .toBe(format === 'js' ? JSON.stringify(url.replace(' ', '%20')) : url)
    expect(context.emitFile).not.toHaveBeenCalled()
    expect(plugin.resolveFileUrl).toBeUndefined()
  })

  test('keeps the existing plain-text dev file URL including encoded spaces', async () => {
    const { ctx } = await setup('/preview/', 'serve')
    expect(await fileToUrl(ctx, assetId, 'string', true)).toBe(pathToFileURL(assetId).href)
  })

  test('preserves HMR timestamps for dev assets but not inline data', async () => {
    const { plugin, environment, ctx } = await setup('/preview/', 'serve')
    expect(environment).toBeInstanceOf(DevEnvironment)
    const dev = environment as DevEnvironment
    const mod = new EnvironmentModuleNode(`/asset file.png${postfix}`, 'client')
    mod.lastHMRTimestamp = 123
    vi.spyOn(dev.moduleGraph, 'getModuleById').mockReturnValue(mod)
    const load = getHookHandler(plugin.load!)
    expect(await load.call(ctx, `${assetId}?url&v=1#icon`)).toMatchObject({
      code: 'export default "/preview/asset%20file.png?t=123&v=1#icon"',
    })
    const inline = await load.call(ctx, `${assetId}?url&inline`)
    expect(inline).toMatchObject({ code: `export default "data:image/png;base64,${Buffer.from(assetContent).toString('base64')}"` })
    expect(dev.moduleGraph.getModuleById).toHaveBeenCalledOnce()
  })

  test('keeps raw imports as text', async () => {
    const { plugin, context, ctx } = await setup()
    expect(await getHookHandler(plugin.load!).call(ctx, `${assetId}?raw`))
      .toMatchObject({ code: `export default ${JSON.stringify(assetContent)}`, moduleType: 'js' })
    expect(context.addWatchFile).toHaveBeenCalledWith(assetId)
    expect(context.emitFile).not.toHaveBeenCalled()
  })

  test('uses per-reference metadata for file URLs and postfixes without changing ordinary URLs', async () => {
    const { plugin, ctx } = await setup()
    // File URLs are requested for cleaned ids (SSR wasm upstream), so they carry no postfix.
    const fileUrlId = (await fileToUrl(ctx, `${assetId}?no-inline`, 'js', true)).match(fileUrlExpressionRE)?.[1]
    const postfixUrlId = (await fileToUrl(ctx, `${assetId}?no-inline&v=1#icon`, 'js')).match(fileUrlExpressionRE)?.[1]
    expect(fileUrlId).toBeDefined()
    expect(postfixUrlId).toBeDefined()
    expect(postfixUrlId).not.toBe(fileUrlId)
    const resolve = getHookHandler(plugin.resolveFileUrl!)
    const args = { fileName: outputName, chunkId: 'assets/main.js', format: 'es' as const, referenceId, relativePath: 'asset file.png', moduleId: assetId }
    expect(resolve.call(ctx, { ...args, urlId: fileUrlId })).toBe("new URL('asset file.png', import.meta.url).href")
    expect(resolve.call(ctx, { ...args, urlId: postfixUrlId })).toBe(`"/preview/assets/asset%20file.png${postfix}"`)
    expect(resolve.call(ctx, args)).toBe('"/preview/assets/asset%20file.png"')
    expect(ROLLUP_HOOKS).toContain('resolveFileUrl')
  })
})

describe('asset text consumers', () => {
  test.each(['/preview/', './'])('replaces assets and public URLs in JS-embedded CSS with base %s', async base => {
    const { ctx } = await setup(base)
    const token = await fileToUrl(ctx, `${assetId}?no-inline&v=1#icon`, 'string')
    const publicToken = await fileToUrl(ctx, '/public.png?v=1#icon', 'string')
    const chunk = createChunk()
    const result = renderAssetUrlInJS(ctx, chunk, { format: 'es' } as NormalizedOutputOptions,
      JSON.stringify(`.asset{background:url(${token})}.public{background:url(${publicToken})}`))!.toString()
    expect(result).not.toContain('__VITE_')
    expect(result).toContain(postfix)
    expect(result).toContain(base === './'
      ? `new URL('asset file.png${postfix}', import.meta.url).href`
      : `/preview/assets/asset%20file.png${postfix}`)
    expect(result).toContain(base === './'
      ? "new URL('../public.png?v=1#icon', import.meta.url).href"
      : `/preview/public.png${postfix}`)
    expect([...chunk.viteMetadata!.importedAssets]).toEqual([outputName])
  })

  test.each(['/preview/', './'])('replaces extracted CSS URLs and records filenames with base %s', async base => {
    const { config, ctx, context } = await setup(base)
    const css = cssPlugin(config)
    const post = cssPostPlugin(config)
    await getHookHandler(css.buildStart!).call(ctx, {} as never)
    try {
      await getHookHandler(post.renderStart!).call(ctx, {} as never, {} as never)
      const id = path.join(root, 'style.css')
      const token = await fileToUrl(ctx, `${assetId}?no-inline&v=1#icon`, 'string')
      const publicToken = await fileToUrl(ctx, '/public.png?v=1#icon', 'string')
      await getHookHandler(post.transform!).call(ctx as never,
        `.asset{background:url(${token})}.public{background:url(${publicToken})}`, id)
      const chunk = createChunk({ [id]: {} as never })
      await getHookHandler(post.renderChunk!).call(ctx, 'export default 1', chunk,
        { format: 'es' } as NormalizedOutputOptions, { chunks: { [chunk.fileName]: chunk } })
      const emitted = context.emitFile.mock.calls.map(([file]) => file)
        .find(file => file.type === 'asset' && file.name === 'main.css')
      expect(emitted?.source).toContain(`url(${base === './' ? './' : '/preview/assets/'}asset%20file.png${postfix})`)
      expect(emitted?.source).toContain(`url(${base === './' ? '../' : '/preview/'}public.png${postfix})`)
      expect(emitted?.source).not.toContain('__VITE_')
      expect([...chunk.viteMetadata!.importedAssets]).toEqual([outputName])
    } finally {
      await getHookHandler(css.buildEnd!).call(ctx)
    }
  })
})

describe('asset renderBuiltUrl', () => {
  test('receives asset postfixes in JS and CSS', async () => {
    const renderBuiltUrl = vi.fn<(filename: string) => string>(filename => injectQuery(filename, 'dpl=id'))
    const { config, ctx, context } = await setup('/preview/', 'build', { experimental: { renderBuiltUrl } })
    const valueToken = await fileToUrl(ctx, `${assetId}?no-inline&marker=value`, 'string')
    const otherToken = await fileToUrl(ctx, `${assetId}?no-inline&marker=other`, 'string')

    const js = renderAssetUrlInJS(ctx, createChunk(), { format: 'es' } as NormalizedOutputOptions,
      `console.log(${JSON.stringify(valueToken)}, ${JSON.stringify(otherToken)})`)!.toString()
    expect(js).toContain('?dpl=id&marker=value')
    expect(js).toContain('?dpl=id&marker=other')

    const css = cssPlugin(config)
    const post = cssPostPlugin(config)
    await getHookHandler(css.buildStart!).call(ctx, {} as never)
    try {
      await getHookHandler(post.renderStart!).call(ctx, {} as never, {} as never)
      const id = path.join(root, 'style.css')
      await getHookHandler(post.transform!).call(ctx as never,
        `.asset-a{background:url(${valueToken})}.asset-b{background:url(${otherToken})}`, id)
      const chunk = createChunk({ [id]: {} as never })
      await getHookHandler(post.renderChunk!).call(ctx, 'export default 1', chunk,
        { format: 'es' } as NormalizedOutputOptions, { chunks: { [chunk.fileName]: chunk } })
      const emitted = context.emitFile.mock.calls.map(([file]) => file)
        .find(file => file.type === 'asset' && file.name === 'main.css')
      expect(emitted?.source).toContain('?dpl=id&marker=value')
      expect(emitted?.source).toContain('?dpl=id&marker=other')
    } finally {
      await getHookHandler(css.buildEnd!).call(ctx)
    }
  })
})

describe('asset plugin with native Rolldown', () => {
  test.each(['/preview/', '/encoded%20base/', './'])('resolves emitted asset and chunk hashes with base %s', async base => {
    const { plugin, environment } = await setup(base)
    let chunkRef: string
    const importedAssets = new Set<string>()
    const bundle = await rolldown({
      input: 'entry',
      plugins: [{
        name: 'asset-fixture',
        buildStart(options) {
          this.environment = environment
          getHookHandler(plugin.buildStart!).call(this, options)
          chunkRef = this.emitFile({ type: 'chunk', id: 'emitted', name: 'emitted' })
        },
        resolveId: id => id,
        async load(id) {
          this.environment = environment
          if (id === 'entry') {
            return `import asset from ${JSON.stringify(`${assetId}?url&no-inline&v=1#icon`)};
              export { asset };
              export const emitted = import.meta.ROLLDOWN_FILE_URL_${chunkRef};`
          }
          if (id === 'emitted') {
            return 'export default "emitted chunk"'
          }
          return getHookHandler(plugin.load!).call(this, id)
        },
        resolveFileUrl(args) {
          this.environment = environment
          return getHookHandler(plugin.resolveFileUrl!).call(this, args)
        },
        renderChunk(code, chunk, options, meta) {
          this.environment = environment
          chunk.viteMetadata = { importedAssets: new Set(), importedCss: new Set() }
          const result = getHookHandler(plugin.renderChunk!).call(this, code, chunk, options, meta)
          for (const file of chunk.viteMetadata.importedAssets) {
            importedAssets.add(file)
          }
          return result
        },
      }],
    })
    try {
      const { output } = await bundle.generate({
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      })
      const entry = output.find(file => file.type === 'chunk' && file.name === 'entry')!
      const emitted = output.find(file => file.type === 'chunk' && file.name === 'emitted')!
      const asset = output.find(file => file.type === 'asset')!
      expect(entry.type).toBe('chunk')
      if (entry.type !== 'chunk') { return }
      expect(entry.code).not.toMatch(/ROLLDOWN_FILE_URL|__VITE_ASSET__|!~|%7B|%7D/)
      expect(entry.code).toContain(postfix)
      expect(entry.code).toContain(base === './' ? path.basename(emitted.fileName) : base + emitted.fileName)
      expect(entry.code).toContain(base === './' ? path.basename(asset.fileName) : base + asset.fileName.replace(' ', '%20'))
      expect(entry.code.includes('new URL(')).toBe(base === './')
      expect(importedAssets).toContain(asset.fileName)
      expect(asset.type === 'asset' && Buffer.from(asset.source).toString()).toBe(assetContent)
    } finally {
      await bundle.close()
    }
  })
})
