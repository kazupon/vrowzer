/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import path from 'node:path'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'
import { createServiceWorkerCache } from './core/cache.ts'
import {
  SW_ASSET_PREFIX,
  SW_ASSET_RE,
  SW_ASSET_SUFFIX,
  SW_CONTROLLER_FILTER_RE,
  SW_FILE_ID,
  SW_QUERY
} from './core/constants.ts'
import { resolveOptions } from './core/options.ts'
import { detectAndResolveServiceWorkers, needsTransform } from './transform/utils.ts'

import type { Compiler as RspackCompiler } from '@rspack/core'
import type { UnpluginInstance } from 'unplugin'
import type { TransformPluginContext as RolldownTransformContext } from 'rolldown'
import type {
  Plugin as RollupPlugin,
  TransformPluginContext as RollupTransformContext
} from 'rollup'
import type { ResolvedConfig as ViteResolvedConfig } from 'vite'
import type { Compiler as WebpackCompiler } from 'webpack'
import type { ServiceWorkerCache } from './core/cache.ts'
import type { Options } from './core/options.ts'
import type { ResolvedServiceWorker } from './transform/utils.ts'

/**
 * Service Worker plugin context
 */
interface PluginContext {
  /** Vite resolved config */
  viteConfig: ViteResolvedConfig | null
  /** Whether in build mode */
  isBuild: boolean
  /** Service Worker cache */
  cache: ServiceWorkerCache
  /** Rollup reference IDs for emitted chunks */
  rollupReferenceIds: Map<string, string>
  /** Webpack/Rspack: Service Workers detected during transform */
  pendingServiceWorkers: Map<string, ResolvedServiceWorker>
}

/**
 * Replace URL expression with ROLLUP_FILE_URL reference wrapped in URL constructor
 *
 * NOTE: `import.meta.ROLLUP_FILE_URL_*` resolves to a string (via `.href`),
 * but `createSvcWorkerController` expects a URL object. So we wrap it in
 * `new URL(...)` to ensure the result is a proper URL object.
 */
function replaceWithRollupFileUrl(
  s: MagicString,
  startIndex: number,
  endIndex: number,
  referenceId: string
): void {
  s.update(startIndex, endIndex, `new URL(import.meta.ROLLUP_FILE_URL_${referenceId})`)
}

/**
 * Transform code for Rollup/Rolldown
 * Uses native emitFile to emit Service Worker as chunk
 */
function transformForRollup(
  this: RollupTransformContext | RolldownTransformContext,
  code: string,
  id: string,
  ctx: PluginContext
): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
  if (!needsTransform(code)) {
    return null
  }

  const resolved = detectAndResolveServiceWorkers(code, id)
  if (resolved.length === 0) {
    return null
  }

  const s = new MagicString(code)

  for (const sw of resolved) {
    // Emit Service Worker as a separate chunk using native Rollup emitFile
    const referenceId = this.emitFile({
      type: 'chunk',
      id: sw.filePath,
      name: path.basename(sw.filePath, path.extname(sw.filePath))
    })

    // Store reference ID for later use
    ctx.rollupReferenceIds.set(sw.filePath, referenceId)

    // Replace URL expression with ROLLUP_FILE_URL
    replaceWithRollupFileUrl(s, sw.detected.startIndex, sw.detected.endIndex, referenceId)

    // Add watch file
    this.addWatchFile(sw.filePath)
  }

  return {
    code: s.toString(),
    map: s.generateMap({ source: id, file: `${id}.map`, includeContent: true })
  }
}

/**
 * Generate placeholder hash from file path (same as transform)
 */
function generatePlaceholderHash(filePath: string): string {
  let hash = 0
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}

/**
 * Generate content hash for cache busting
 */
function generateContentHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}

/**
 * Bundle Service Worker using rolldown
 */
async function bundleServiceWorkerWithRolldown(
  entryPath: string,
  options: { minify?: boolean; sourcemap?: boolean | 'inline' } = {}
): Promise<{ code: string } | null> {
  const { rolldown } = await import('rolldown')
  const bundle = await rolldown({
    input: entryPath,
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default']
    }
  })

  const { output } = await bundle.generate({
    format: 'iife',
    sourcemap: options.sourcemap ? 'inline' : false,
    minify: options.minify ?? false
  })

  await bundle.close()

  const chunk = output.find(o => o.type === 'chunk' && o.isEntry)
  if (!chunk || chunk.type !== 'chunk') {
    return null
  }

  return { code: chunk.code }
}

/**
 * Setup Webpack/Rspack compiler hooks for Service Worker bundling
 */
function setupWebpackLikeCompiler(
  compiler: WebpackCompiler,
  ctx: PluginContext,
  cache: ServiceWorkerCache,
  pluginName: string,
  _framework: 'webpack' | 'rspack'
): void {
  // Use thisCompilation to access compilation hooks
  compiler.hooks.thisCompilation.tap(pluginName, compilation => {
    // Use processAssets hook to bundle Service Workers and replace placeholders
    compilation.hooks.processAssets.tapAsync(
      {
        name: pluginName,
        // Run after optimization but before summarizing
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
      },
      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- ignore
      async (assets, callback) => {
        try {
          // Bundle pending Service Workers using child compiler
          for (const [swPath] of ctx.pendingServiceWorkers) {
            const hashStr = generatePlaceholderHash(swPath)

            // Check if already bundled
            if (cache.getFilenameFromHash(hashStr)) {
              continue
            }

            // Bundle Service Worker using child compiler
            const bundledFilename = await bundleWithChildCompiler(
              compiler,
              compilation,
              swPath,
              pluginName
            )

            if (bundledFilename) {
              // Register hash to filename mapping for placeholder replacement
              cache.registerHashToFilename(hashStr, bundledFilename)
            }
          }

          // Replace placeholders in all JS assets
          for (const [assetName, asset] of Object.entries(assets)) {
            if (!assetName.endsWith('.js')) {
              continue
            }

            const source = asset.source().toString()
            SW_ASSET_RE.lastIndex = 0

            if (!SW_ASSET_RE.test(source)) {
              continue
            }

            SW_ASSET_RE.lastIndex = 0
            let replaced = source
            let match: RegExpExecArray | null

            while ((match = SW_ASSET_RE.exec(source))) {
              const [full, hash] = match
              if (!hash) continue

              const filename = cache.getFilenameFromHash(hash)
              if (filename) {
                // Replace placeholder with actual filename
                const publicPath = compilation.outputOptions.publicPath || '/'
                const assetUrl =
                  typeof publicPath === 'string'
                    ? publicPath.endsWith('/')
                      ? `${publicPath}${filename}`
                      : `${publicPath}/${filename}`
                    : filename
                replaced = replaced.replace(full, assetUrl)
              }
            }

            if (replaced !== source) {
              // Update asset with replaced content
              compilation.updateAsset(assetName, new compiler.webpack.sources.RawSource(replaced))
            }
          }

          callback()
        } catch (err) {
          callback(err as Error)
        }
      }
    )
  })
}

/**
 * Bundle Service Worker using Webpack/Rspack child compiler
 */
async function bundleWithChildCompiler(
  compiler: WebpackCompiler,
  compilation: Parameters<Parameters<WebpackCompiler['hooks']['thisCompilation']['tap']>[1]>[0],
  entryPath: string,
  pluginName: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Create child compiler
    const childCompiler = compilation.createChildCompiler(
      `${pluginName}:service-worker`,
      {
        filename: `[name]-[contenthash:8].js`,
        chunkFilename: `[name]-[contenthash:8].js`
      },
      []
    )

    // Add entry
    const entryName = path.basename(entryPath, path.extname(entryPath))
    const EntryPlugin = compiler.webpack.EntryPlugin
    new EntryPlugin(path.dirname(entryPath), entryPath, { name: entryName }).apply(childCompiler)

    // Compile
    childCompiler.runAsChild((err, _entries, childCompilation) => {
      if (err) {
        reject(err)
        return
      }

      if (!childCompilation) {
        resolve(null)
        return
      }

      // Get the output filename
      const outputFiles = Array.from(childCompilation.chunks).flatMap(chunk =>
        Array.from(chunk.files)
      )

      const firstFile = outputFiles[0]
      if (firstFile) {
        resolve(firstFile)
      } else {
        resolve(null)
      }
    })
  })
}

export const ServiceWorkerPlugin: UnpluginInstance<Options | undefined, false> = createUnplugin(
  (rawOptions = {}, meta) => {
    const options = resolveOptions(rawOptions)
    const cache = createServiceWorkerCache()

    const ctx: PluginContext = {
      viteConfig: null,
      isBuild: false,
      cache,
      rollupReferenceIds: new Map(),
      pendingServiceWorkers: new Map()
    }

    const name = 'unplugin-service-worker'

    // Check framework type
    const isRollup = meta.framework === 'rollup'
    const isRolldown = meta.framework === 'rolldown'
    const isRollupLike = isRollup || isRolldown
    const isWebpack = meta.framework === 'webpack'
    const isRspack = meta.framework === 'rspack'
    const isWebpackLike = isWebpack || isRspack
    const isFarm = meta.framework === 'farm'

    return {
      name,
      enforce: options.enforce,

      buildStart() {
        // Clear cache at build start
        cache.clear()
        ctx.rollupReferenceIds.clear()
        ctx.pendingServiceWorkers.clear()
        // Rollup/Rolldown/Webpack/Rspack/Farm is always build mode
        if (isRollupLike || isWebpackLike || isFarm) {
          ctx.isBuild = true
        }
      },

      // Common transform for Vite (dev mode handled here)
      transform: isRollupLike
        ? undefined // Rollup/Rolldown uses framework-specific transform
        : {
            filter: {
              id: { include: options.include, exclude: options.exclude },
              code: SW_CONTROLLER_FILTER_RE
            },
            handler(code, id) {
              const resolved = detectAndResolveServiceWorkers(code, id)
              if (resolved.length === 0) {
                return null
              }

              const s = new MagicString(code)

              // Build mode: use placeholder replacement for Vite/Webpack/Rspack
              if (ctx.isBuild) {
                for (const sw of resolved) {
                  // Generate placeholder hash
                  let hash = 0
                  for (let i = 0; i < sw.filePath.length; i++) {
                    const char = sw.filePath.charCodeAt(i)
                    hash = (hash << 5) - hash + char
                    hash = hash & hash
                  }
                  const hashStr = Math.abs(hash).toString(36).slice(0, 8)
                  const placeholder = `${SW_ASSET_PREFIX}${hashStr}${SW_ASSET_SUFFIX}`

                  // Use different URL construction for Webpack/Rspack
                  // Webpack/Rspack resolves import.meta.url to file:// path at build time,
                  // so we use self.location.origin instead which works at runtime in browser
                  const urlConstruction = isWebpackLike
                    ? `new URL(/* @vite-ignore */ ${JSON.stringify(placeholder)}, self.location.origin)`
                    : `new URL(/* @vite-ignore */ ${JSON.stringify(placeholder)}, '' + import.meta.url)`

                  s.update(sw.detected.startIndex, sw.detected.endIndex, urlConstruction)

                  // Track Service Worker for bundling (Vite/Webpack/Rspack)
                  ctx.pendingServiceWorkers.set(sw.filePath, sw)

                  this.addWatchFile(sw.filePath)
                }

                return {
                  code: s.toString(),
                  map: s.generateMap({ source: id, file: `${id}.map`, includeContent: true })
                }
              }

              // Dev mode: use query parameter
              for (const sw of resolved) {
                const hasQuery = sw.urlPath.includes('?')
                const separator = hasQuery ? '&' : '?'
                const devUrl = `${sw.urlPath}${separator}${SW_QUERY}=${SW_FILE_ID}`
                s.update(
                  sw.detected.startIndex,
                  sw.detected.endIndex,
                  `new URL(/* @vite-ignore */ ${JSON.stringify(devUrl)}, '' + import.meta.url)`
                )
              }

              return {
                code: s.toString(),
                map: s.generateMap({ source: id, file: `${id}.map`, includeContent: true })
              }
            }
          },

      watchChange(id) {
        // Invalidate affected bundles when a watched file changes
        cache.invalidateAffectedBundles(id)
      },

      // Rollup-specific hooks
      rollup: {
        transform: {
          filter: {
            id: options.include,
            code: SW_CONTROLLER_FILTER_RE
          },
          handler(code, id) {
            return transformForRollup.call(this, code, id, ctx)
          }
        }
      } satisfies Partial<RollupPlugin>,

      // Rolldown-specific hooks
      // NOTE: Avoiding `satisfies` to prevent type conflicts between rolldown versions
      rolldown: {
        transform: {
          filter: {
            id: options.include,
            code: SW_CONTROLLER_FILTER_RE
          },
          handler(code: string, id: string) {
            return transformForRollup.call(this as unknown as RollupTransformContext, code, id, ctx)
          }
        }
      },

      // Vite-specific hooks
      // NOTE: Using `unknown` type to avoid @types/node version mismatch issues between packages
      vite: {
        configResolved(config: unknown) {
          const viteConfig = config as ViteResolvedConfig
          ctx.viteConfig = viteConfig
          ctx.isBuild = viteConfig.command === 'build'
        },

        configureServer(server) {
          // Middleware to handle Service Worker requests in dev mode
          // eslint-disable-next-line @typescript-eslint/no-misused-promises -- ignore
          server.middlewares.use(async (req, res, next) => {
            const url = req.url
            if (!url) {
              next()
              return
            }

            // Check for Service Worker query parameter
            const urlObj = new URL(url, 'http://localhost')
            const swQuery = urlObj.searchParams.get(SW_QUERY)
            if (swQuery !== SW_FILE_ID) {
              next()
              return
            }

            // Remove query parameter to get the actual file path
            urlObj.searchParams.delete(SW_QUERY)
            const cleanPath = urlObj.pathname

            // Resolve the file path
            const resolved = await server.pluginContainer.resolveId(cleanPath, undefined, {
              ssr: false
            })
            if (!resolved) {
              next()
              return
            }

            const filePath = resolved.id

            try {
              // Bundle the Service Worker with rolldown
              const result = await bundleServiceWorkerWithRolldown(filePath, {
                minify: false,
                sourcemap: 'inline'
              })

              if (!result) {
                res.statusCode = 500
                res.end('Failed to bundle Service Worker')
                return
              }

              // Send the bundled Service Worker
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
              res.end(result.code)
            } catch (error) {
              console.error('[unplugin-service-worker] Failed to bundle Service Worker:', error)
              res.statusCode = 500
              res.end(
                `Failed to bundle Service Worker: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            }
          })
        },

        renderChunk: {
          order: 'post',
          async handler(code, _chunk) {
            if (!ctx.viteConfig || !ctx.isBuild) {
              return null
            }

            // Reset regex lastIndex
            SW_ASSET_RE.lastIndex = 0
            if (!SW_ASSET_RE.test(code)) {
              return null
            }

            // Bundle pending Service Workers using rolldown (on first matching chunk)
            for (const [swPath] of ctx.pendingServiceWorkers) {
              const hashStr = generatePlaceholderHash(swPath)

              // Check if already bundled
              if (cache.getFilenameFromHash(hashStr)) {
                continue
              }

              // Bundle Service Worker with rolldown
              const result = await bundleServiceWorkerWithRolldown(swPath, {
                minify: ctx.viteConfig.build.minify !== false,
                sourcemap: ctx.viteConfig.build.sourcemap ? 'inline' : false
              })

              if (result) {
                const basename = path.basename(swPath, path.extname(swPath))
                const contentHash = generateContentHash(result.code)
                const outputFilename = `${ctx.viteConfig.build.assetsDir}/${basename}-${contentHash}.js`

                // Register the placeholder hash -> filename mapping
                // This is critical: the placeholder uses hash of swPath, not outputFilename
                cache.registerHashToFilename(hashStr, outputFilename)

                // Save to cache for placeholder replacement and asset emission
                cache.saveBundle(swPath, [swPath], outputFilename, result.code, [])
              }
            }

            const s = new MagicString(code)
            SW_ASSET_RE.lastIndex = 0

            let match: RegExpExecArray | null
            while ((match = SW_ASSET_RE.exec(code))) {
              const [full, hash] = match
              if (!hash) continue
              const filename = cache.getFilenameFromHash(hash)
              if (!filename) {
                continue
              }

              // Calculate relative path from chunk to asset
              const base = ctx.viteConfig.base || '/'
              const assetUrl = base.endsWith('/') ? `${base}${filename}` : `${base}/${filename}`

              s.update(match.index, match.index + full.length, assetUrl)
            }

            return {
              code: s.toString(),
              map: ctx.viteConfig.build.sourcemap ? s.generateMap({ hires: 'boundary' }) : null
            }
          }
        },

        async generateBundle(_opts, bundle) {
          if (!ctx.isBuild || !ctx.viteConfig) {
            return
          }

          // Bundle pending Service Workers using rolldown
          for (const [swPath] of ctx.pendingServiceWorkers) {
            const hashStr = generatePlaceholderHash(swPath)

            // Check if already bundled
            if (cache.getFilenameFromHash(hashStr)) {
              continue
            }

            // Bundle Service Worker with rolldown
            const result = await bundleServiceWorkerWithRolldown(swPath, {
              minify: ctx.viteConfig.build.minify !== false,
              sourcemap: ctx.viteConfig.build.sourcemap ? 'inline' : false
            })

            if (result) {
              const basename = path.basename(swPath, path.extname(swPath))
              // Generate content hash for filename
              const contentHash = generateContentHash(result.code)
              const outputFilename = `${ctx.viteConfig.build.assetsDir}/${basename}-${contentHash}.js`

              // Register the placeholder hash -> filename mapping
              cache.registerHashToFilename(hashStr, outputFilename)

              // Save to cache for placeholder replacement
              cache.saveBundle(swPath, [swPath], outputFilename, result.code, [])

              // Emit the bundled Service Worker as asset
              this.emitFile({
                type: 'asset',
                fileName: outputFilename,
                source: result.code
              })
            }
          }

          // Emit all bundled Service Workers
          for (const swBundle of cache.getAllBundles()) {
            // Skip if already in bundle
            if (bundle[swBundle.entryFilename]) {
              continue
            }

            this.emitFile({
              type: 'asset',
              fileName: swBundle.entryFilename,
              source: swBundle.entryCode
            })
          }

          // Emit all other cached assets (additional chunks)
          for (const asset of cache.getAllAssets()) {
            // Skip if already in bundle
            if (bundle[asset.fileName]) {
              continue
            }

            this.emitFile({
              type: 'asset',
              fileName: asset.fileName,
              source: asset.source
            })
          }
        }
      },

      // Webpack-specific hook
      webpack(compiler: WebpackCompiler) {
        setupWebpackLikeCompiler(compiler, ctx, cache, name, 'webpack')
      },

      // Rspack-specific hook
      rspack(compiler: RspackCompiler) {
        setupWebpackLikeCompiler(compiler as unknown as WebpackCompiler, ctx, cache, name, 'rspack')
      },

      // esbuild-specific hooks
      esbuild: {
        setup(build) {
          const pendingServiceWorkers = new Map<string, ResolvedServiceWorker>()
          const processedFiles = new Map<string, string>() // swPath -> outputFileName

          // Transform files to detect Service Worker references
          build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
            const fs = await import('node:fs/promises')
            const contents = await fs.readFile(args.path, 'utf8')

            if (!needsTransform(contents)) {
              return null
            }

            const resolved = detectAndResolveServiceWorkers(contents, args.path)
            if (resolved.length === 0) {
              return null
            }

            const s = new MagicString(contents)

            for (const sw of resolved) {
              pendingServiceWorkers.set(sw.filePath, sw)

              // Generate placeholder for Service Worker URL
              const hashStr = generatePlaceholderHash(sw.filePath)
              const placeholder = `${SW_ASSET_PREFIX}${hashStr}${SW_ASSET_SUFFIX}`

              // Replace URL expression with placeholder
              s.update(
                sw.detected.startIndex,
                sw.detected.endIndex,
                `new URL("${placeholder}", import.meta.url)`
              )
            }

            return {
              contents: s.toString(),
              loader: args.path.endsWith('.ts') || args.path.endsWith('.tsx') ? 'ts' : 'js'
            }
          })

          // Bundle Service Workers and replace placeholders at the end
          build.onEnd(async result => {
            if (!result.outputFiles && !build.initialOptions.outdir) {
              return
            }

            // Resolve outdir to absolute path to avoid writing to wrong directory
            const rawOutdir = build.initialOptions.outdir || '.'
            const absWorkingDir = build.initialOptions.absWorkingDir || process.cwd()
            const outdir = path.isAbsolute(rawOutdir)
              ? rawOutdir
              : path.resolve(absWorkingDir, rawOutdir)

            // Bundle each Service Worker
            for (const [swPath] of pendingServiceWorkers) {
              // Check if already processed
              if (processedFiles.has(swPath)) {
                continue
              }

              // Normalize sourcemap option for rolldown
              const sourcemapOption = build.initialOptions.sourcemap
              const normalizedSourcemap: boolean | 'inline' | undefined =
                sourcemapOption === 'both' || sourcemapOption === 'inline'
                  ? 'inline'
                  : sourcemapOption === 'external' || sourcemapOption === 'linked'
                    ? true
                    : sourcemapOption

              // Bundle Service Worker
              const bundleResult = await bundleServiceWorkerWithRolldown(swPath, {
                minify: build.initialOptions.minify ?? false,
                sourcemap: normalizedSourcemap ?? false
              })

              if (!bundleResult) {
                console.error(`[unplugin-service-worker] Failed to bundle: ${swPath}`)
                continue
              }

              // Generate output filename with content hash
              const contentHash = generateContentHash(bundleResult.code)
              const baseName = path.basename(swPath, path.extname(swPath))
              const outputFileName = `${baseName}-${contentHash}.js`

              processedFiles.set(swPath, outputFileName)

              // Write Service Worker file
              const fs = await import('node:fs/promises')
              const outputPath = path.join(outdir, outputFileName)
              await fs.mkdir(path.dirname(outputPath), { recursive: true })
              await fs.writeFile(outputPath, bundleResult.code)

              console.log(`[unplugin-service-worker] Emitted: ${outputFileName}`)
            }

            // Replace placeholders in output files
            if (result.outputFiles) {
              // write: false mode - modify in-memory output files
              for (const outputFile of result.outputFiles) {
                let text = outputFile.text
                let modified = false

                for (const [swPath, outputFileName] of processedFiles) {
                  const hashStr = generatePlaceholderHash(swPath)
                  const placeholder = `${SW_ASSET_PREFIX}${hashStr}${SW_ASSET_SUFFIX}`

                  if (text.includes(placeholder)) {
                    text = text.replace(new RegExp(placeholder, 'g'), outputFileName)
                    modified = true
                  }
                }

                if (modified) {
                  // Update output file content
                  Object.defineProperty(outputFile, 'text', { value: text })
                  Object.defineProperty(outputFile, 'contents', {
                    value: new TextEncoder().encode(text)
                  })
                }
              }
            } else {
              // write: true mode (default) - read files from disk and replace placeholders
              const fs = await import('node:fs/promises')
              const jsFiles = await fs.readdir(outdir, { recursive: true })

              for (const file of jsFiles) {
                if (typeof file !== 'string' || !file.endsWith('.js')) {
                  continue
                }

                const filePath = path.join(outdir, file)
                let content = await fs.readFile(filePath, 'utf8')
                let modified = false

                for (const [swPath, outputFileName] of processedFiles) {
                  const hashStr = generatePlaceholderHash(swPath)
                  const placeholder = `${SW_ASSET_PREFIX}${hashStr}${SW_ASSET_SUFFIX}`

                  if (content.includes(placeholder)) {
                    content = content.replace(new RegExp(placeholder, 'g'), outputFileName)
                    modified = true
                  }
                }

                if (modified) {
                  await fs.writeFile(filePath, content)
                }
              }
            }
          })
        }
      },

      // Farm-specific hooks
      farm: {
        finish: {
          async executor() {
            if (!isFarm || !ctx.isBuild) {
              return
            }

            // Get output directory from pendingServiceWorkers
            // Farm outputs to the configured output.path
            const outputDir =
              ctx.pendingServiceWorkers.size > 0
                ? path.dirname(path.dirname(Array.from(ctx.pendingServiceWorkers.keys())[0] || ''))
                : null

            if (!outputDir) {
              return
            }

            const fs = await import('node:fs/promises')

            // Find the actual output directory by looking for JS files
            let farmOutputDir: string | null = null
            try {
              // Try common Farm output locations
              // Note: Do NOT include `outputDir` as fallback, as it may incorrectly
              // point to source directories when derived from pendingServiceWorkers paths
              const possibleDirs = [
                path.join(outputDir, 'dist'),
                path.join(outputDir, '.output', 'farm')
              ]

              for (const dir of possibleDirs) {
                try {
                  const files = await fs.readdir(dir, { recursive: true })
                  if (files.some(f => typeof f === 'string' && f.endsWith('.js'))) {
                    farmOutputDir = dir
                    break
                  }
                } catch {
                  continue
                }
              }
            } catch {
              return
            }

            if (!farmOutputDir) {
              return
            }

            // Bundle pending Service Workers
            for (const [swPath] of ctx.pendingServiceWorkers) {
              const hashStr = generatePlaceholderHash(swPath)

              // Check if already bundled
              if (cache.getFilenameFromHash(hashStr)) {
                continue
              }

              // Bundle Service Worker with rolldown
              const result = await bundleServiceWorkerWithRolldown(swPath, {
                minify: false,
                sourcemap: false
              })

              if (result) {
                const basename = path.basename(swPath, path.extname(swPath))
                const contentHash = generateContentHash(result.code)
                const outputFilename = `assets/${basename}-${contentHash}.js`

                // Register hash to filename mapping
                cache.registerHashToFilename(hashStr, outputFilename)

                // Write Service Worker file
                const outputPath = path.join(farmOutputDir, outputFilename)
                await fs.mkdir(path.dirname(outputPath), { recursive: true })
                await fs.writeFile(outputPath, result.code)
              }
            }

            // Replace placeholders in all JS files
            const allFiles = await fs.readdir(farmOutputDir, { recursive: true })

            for (const file of allFiles) {
              if (typeof file !== 'string' || !file.endsWith('.js')) {
                continue
              }

              const filePath = path.join(farmOutputDir, file)
              let content = await fs.readFile(filePath, 'utf8')
              let modified = false

              SW_ASSET_RE.lastIndex = 0
              let match: RegExpExecArray | null
              while ((match = SW_ASSET_RE.exec(content))) {
                const [full, hash] = match
                if (!hash) continue

                const filename = cache.getFilenameFromHash(hash)
                if (filename) {
                  content = content.replace(full, `/${filename}`)
                  modified = true
                }
              }

              if (modified) {
                await fs.writeFile(filePath, content)
              }
            }
          }
        }
      }
    }
  }
)

// Re-export for convenience
export { type Options } from './core/options.ts'
export { type ServiceWorkerCache } from './core/cache.ts'
