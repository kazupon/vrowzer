/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import MagicString from 'magic-string'
import path from 'node:path'
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
import { injectEnvironmentToHooks } from './core/environment-hooks.ts'
import { resolveOptions } from './core/options.ts'
import { detectAndResolveServiceWorkers, needsTransform } from './transform/utils.ts'

import type { Compiler as RspackCompiler } from '@rspack/core'
import type { PluginBuild as EsbuildPluginBuild } from 'esbuild'
import type { TransformPluginContext as RolldownTransformContext } from 'rolldown'
import type {
  Plugin as RollupPlugin,
  TransformPluginContext as RollupTransformContext
} from 'rollup'
import type { UnpluginInstance } from 'unplugin'
import type { ViteDevServer, ResolvedConfig as ViteResolvedConfig } from 'vite'
import type { Compiler as WebpackCompiler } from 'webpack'
import type { ServiceWorkerCache } from './core/cache.ts'
import type { Options, OptionsResolved } from './core/options.ts'
import type { ResolvedServiceWorker } from './transform/utils.ts'

/**
 * Service Worker bundler configuration extracted from parent bundler
 */
interface ServiceWorkerBundlerConfig {
  define?: Record<string, string> | undefined
  alias?: Record<string, string> | undefined
  plugins?: import('rolldown').Plugin[] | undefined
}

/**
 * Options for bundleServiceWorkerWithRolldown
 */
interface BundleServiceWorkerOptions {
  minify?: boolean | undefined
  sourcemap?: boolean | 'inline' | undefined
  define?: Record<string, string> | undefined
  alias?: Record<string, string> | undefined
  plugins?: import('rolldown').Plugin[] | undefined
}

/**
 * Service Worker plugin context
 */
interface PluginContext {
  /**
   * Vite resolved config
   */
  viteConfig: ViteResolvedConfig | null
  /**
   * Whether in build mode
   */
  isBuild: boolean
  /**
   * Whether in test mode (Vitest)
   */
  isTest: boolean
  /**
   * Service Worker cache
   */
  cache: ServiceWorkerCache
  /**
   * Rollup reference IDs for emitted chunks
   */
  rollupReferenceIds: Map<string, string>
  /**
   * Webpack/Rspack: Service Workers detected during transform
   */
  pendingServiceWorkers: Map<string, ResolvedServiceWorker>
  /**
   * Bundler configuration extracted from parent bundler
   */
  bundlerConfig: ServiceWorkerBundlerConfig
}

/**
 * Utility Functions
 */

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
 * Sanitize define values to ensure they are all strings
 */
function sanitizeDefine(
  define: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!define) return undefined
  return Object.fromEntries(
    Object.entries(define).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    ])
  )
}

/**
 * Normalize alias configuration to Record<string, string>
 * Handles both Vite's array format and object format
 */
function normalizeAlias(alias: unknown): Record<string, string> | undefined {
  if (!alias) return undefined

  if (Array.isArray(alias)) {
    const result: Record<string, string> = {}
    for (const item of alias) {
      if (item && typeof item === 'object' && 'find' in item && 'replacement' in item) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- ignore
        const find = typeof item.find === 'string' ? item.find : item.find.toString()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ignore
        result[find] = item.replacement as string
      }
    }
    return Object.keys(result).length > 0 ? result : undefined
  }

  if (typeof alias === 'object') {
    return alias as Record<string, string>
  }

  return undefined
}

/**
 * Filter plugins suitable for Service Worker bundling.
 *
 * Uses an allowlist approach for Vite/native internal plugins (prefixed with `vite:` or `native:`).
 * Many Vite internal plugins depend on APIs not available in standalone rolldown
 * (e.g., moduleGraph, viteMetadata, dev server state), so we only forward plugins
 * known to work correctly with the environment injection adapter.
 *
 * Non-Vite plugins (user plugins, third-party plugins) are passed through by default.
 */
function filterServiceWorkerPlugins(
  plugins: unknown[] | undefined
): import('rolldown').Plugin[] | undefined {
  if (!plugins || plugins.length === 0) return undefined

  // Vite internal plugins known to work safely in standalone rolldown
  // with environment injection. Based on Vite's own worker bundling pipeline.
  const allowedVitePlugins = new Set([
    'vite:asset', // handles ?raw, ?url, ?inline imports
    'vite:define', // define replacements
    'vite:json', // JSON imports
    'native:json', // native JSON plugin variant
    'vite:wasm-helper', // WASM support
    'vite:wasm-fallback', // WASM fallback
    'native:wasm-fallback' // native WASM fallback variant
  ])

  return plugins.filter(p => {
    if (!p || typeof p !== 'object') return false
    const name = (p as { name?: string }).name
    if (!name) return true
    // For Vite/native internal plugins, only allow known-safe ones
    if (name.startsWith('vite:') || name.startsWith('native:')) {
      return allowedVitePlugins.has(name)
    }
    // Exclude self to avoid recursion
    if (name === 'unplugin-service-worker') return false
    // Pass through all other plugins (user plugins, third-party plugins)
    return true
  }) as import('rolldown').Plugin[]
}

/**
 * Merge user-provided plugins with plugins extracted from the parent bundler.
 * User plugins take precedence (listed first).
 */
function resolveServiceWorkerPlugins(
  userPlugins: import('rolldown').Plugin[] | undefined,
  bundlerPlugins: import('rolldown').Plugin[] | undefined
): import('rolldown').Plugin[] {
  return [...(userPlugins ?? []), ...(bundlerPlugins ?? [])]
}

/**
 * Default defines for Service Worker bundling.
 * Service Workers are bundled into IIFE format where import.meta is not available,
 * so we need to provide fallback values for import.meta and import.meta.env.
 * These are ordered from most specific to least specific to ensure correct replacement.
 */
const DEFAULT_SERVICE_WORKER_DEFINES: Record<string, string> = {
  // Specific environment variables first
  'import.meta.env.VITE_DEBUG_FILTER': 'undefined',
  'import.meta.env.DEBUG': 'undefined',
  'import.meta.env.DEV': 'false',
  'import.meta.env.PROD': 'true',
  'import.meta.env.SSR': 'false',
  'import.meta.env.MODE': '"production"',
  'import.meta.env.BASE_URL': '"/"',
  // Then the object replacements (less specific)
  'import.meta.env': '{}',
  'import.meta': '{}'
}

/**
 * Get output directory from scope value.
 *
 * @param scope - Scope value (e.g., '/', '/app/', '/api/v1/')
 * @param defaultDir - Default directory when scope is not specified
 * @returns Directory path without leading/trailing slashes
 */
function getOutputDirFromScope(scope: string | undefined, defaultDir: string): string {
  if (!scope) {
    return defaultDir
  }
  // Remove leading and trailing slashes, return empty string for root
  const normalized = scope.replace(/^\/|\/$/g, '')
  return normalized || '' // empty string means root
}

/**
 * Build output filename with scope-based directory.
 *
 * @param basename - Base name of the file (without extension)
 * @param contentHash - Content hash for cache busting
 * @param scope - Scope value (e.g., '/', '/app/')
 * @param defaultDir - Default directory when scope is not specified
 * @returns Full output filename with directory
 */
function buildOutputFilename(
  basename: string,
  contentHash: string,
  scope: string | undefined,
  defaultDir: string
): string {
  const dir = getOutputDirFromScope(scope, defaultDir)
  if (dir === '') {
    return `${basename}-${contentHash}.js`
  }
  return `${dir}/${basename}-${contentHash}.js`
}

/**
 * Regex matching Vite query parameters: ?raw, ?url, ?inline
 */
const VITE_QUERY_RE = /[?&](raw|url|inline)\b/
const RAW_QUERY_RE = /[?&]raw\b/

/**
 * Remove all query parameters and hash from a URL/path
 */
function cleanUrl(url: string): string {
  return url.replace(/[?#].*$/, '')
}

/**
 * Create a built-in plugin for the SW bundler that handles Vite-specific
 * query parameters (?raw, ?url, ?inline) in import specifiers.
 *
 * In Vite's normal pipeline, `vite:resolve` strips queries before resolution
 * and `vite:asset` handles the loading. Since we don't forward `vite:resolve`
 * (it depends heavily on Vite internals), this plugin provides equivalent
 * functionality for the SW bundler context.
 *
 * This plugin is always included in `bundleServiceWorkerWithRolldown`,
 * so it covers all parent bundlers (Vite, Rolldown, Rollup, esbuild, Farm).
 * For webpack/rspack, SW bundling uses child compilers, not rolldown.
 */
function createViteQueryPlugin(): import('rolldown').Plugin {
  return {
    name: 'unplugin-service-worker:vite-query',
    resolveId: {
      filter: { id: VITE_QUERY_RE },
      async handler(id, importer, options) {
        // Strip Vite query parameters before resolution
        const cleanId = cleanUrl(id)

        // Try to resolve without the query
        const resolved = await this.resolve(cleanId, importer, {
          ...options,
          skipSelf: true
        })

        if (resolved && !resolved.external) {
          // Re-append the original query to the resolved path
          const queryMatch = id.match(/(\?[^#]*)/)
          const query = queryMatch ? queryMatch[1] : ''
          return { id: resolved.id + query, external: false }
        }

        // If standard resolution fails (e.g. package exports don't include the subpath),
        // try to find the package root and resolve the file directly.
        // This handles monorepo packages whose exports don't cover all files.
        if (!resolved && cleanId.includes('/')) {
          const directPath = await resolvePackageFileDirect(cleanId, importer)
          if (directPath) {
            const queryMatch = id.match(/(\?[^#]*)/)
            const query = queryMatch ? queryMatch[1] : ''
            return { id: directPath + query, external: false }
          }
        }

        return null
      }
    },
    load: {
      filter: { id: RAW_QUERY_RE },
      async handler(id) {
        // Handle ?raw imports: read the file and return as string export
        const filePath = cleanUrl(id)
        const fs = await import('node:fs/promises')
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          return {
            code: `export default ${JSON.stringify(content)}`,
            moduleType: 'js'
          }
        } catch {
          return null
        }
      }
    }
  }
}

/**
 * Try to resolve a package subpath directly by finding the package root
 * and looking for the file. This handles cases where package.json exports
 * don't include the subpath but the file exists on disk.
 */
async function resolvePackageFileDirect(
  id: string,
  importer: string | undefined
): Promise<string | null> {
  const fs = await import('node:fs/promises')

  // Parse package name from import specifier (handles @scope/pkg and pkg)
  const parts = id.split('/')
  const packageName = id.startsWith('@') && parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0]

  if (!packageName) return null

  // Get the subpath within the package
  const packageNameParts = packageName.split('/').length
  const subpath = parts.slice(packageNameParts).join('/')
  if (!subpath) return null

  // Find the package root by walking up from the importer
  const startDir = importer ? path.dirname(importer) : process.cwd()
  let currentDir = startDir

  while (true) {
    const nodeModulesDir = path.join(currentDir, 'node_modules', packageName)
    try {
      await fs.access(nodeModulesDir)
      // Found the package, try to resolve the file
      const extensions = ['.ts', '.mts', '.js', '.mjs', '.tsx', '.jsx', '']
      for (const ext of extensions) {
        const candidate = path.join(nodeModulesDir, subpath + ext)
        try {
          const stat = await fs.stat(candidate)
          if (stat.isFile()) return candidate
        } catch {
          continue
        }
      }

      // Also try src/ directory (common in monorepos with source access)
      for (const ext of extensions) {
        const candidate = path.join(nodeModulesDir, 'src', subpath + ext)
        try {
          const stat = await fs.stat(candidate)
          if (stat.isFile()) return candidate
        } catch {
          continue
        }
      }
    } catch {
      // Package not found in this node_modules
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  return null
}

/**
 * Bundle Service Worker using rolldown
 */
async function bundleServiceWorkerWithRolldown(
  entryPath: string,
  options: BundleServiceWorkerOptions = {}
): Promise<{ code: string } | null> {
  const { rolldown } = await import('rolldown')

  // Merge user-provided defines with default Service Worker defines
  // User defines take precedence over defaults
  const mergedDefines = {
    ...DEFAULT_SERVICE_WORKER_DEFINES,
    ...options.define
  }

  // Always include the Vite query plugin for ?raw/?url/?inline support.
  // This runs first so it can resolve queries before other plugins process them.
  const allPlugins: import('rolldown').Plugin[] = [
    createViteQueryPlugin(),
    ...(options.plugins && options.plugins.length > 0 ? options.plugins : [])
  ]

  const bundle = await rolldown({
    input: entryPath,
    platform: 'browser',
    resolve: {
      conditionNames: ['browser', 'import', 'module', 'default'],
      ...(options.alias && { alias: options.alias })
    },
    plugins: allPlugins,
    transform: { define: mergedDefines }
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
 * Webpack/Rspack-specific Functions
 */

/**
 * Bundle Service Worker using Webpack/Rspack child compiler
 */
async function bundleWithChildCompiler(
  compiler: WebpackCompiler,
  compilation: Parameters<Parameters<WebpackCompiler['hooks']['thisCompilation']['tap']>[1]>[0],
  entryPath: string,
  pluginName: string,
  scope?: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Determine output directory from scope
    const outputDir = getOutputDirFromScope(scope, '')
    const filenamePrefix = outputDir ? `${outputDir}/` : ''

    // Create child compiler
    const childCompiler = compilation.createChildCompiler(
      `${pluginName}:service-worker`,
      {
        filename: `${filenamePrefix}[name]-[contenthash:8].js`,
        chunkFilename: `${filenamePrefix}[name]-[contenthash:8].js`
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
          for (const [swPath, swInfo] of ctx.pendingServiceWorkers) {
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
              pluginName,
              swInfo?.scope
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
 * Vite-specific Functions
 */

/**
 * Create Vite configResolved hook handler
 */
function createViteConfigResolved(ctx: PluginContext) {
  return async (config: unknown) => {
    const viteConfig = config as ViteResolvedConfig
    ctx.viteConfig = viteConfig
    ctx.isBuild = viteConfig.command === 'build'
    ctx.isTest = viteConfig.mode === 'test'

    // Extract and adapt Vite plugins for Service Worker bundling.
    // Vite plugins expect `this.environment` in hook contexts, which is not available
    // in standalone rolldown. We create a BuildEnvironment and wrap all plugin hooks
    // with environment injection so they work correctly inside the SW bundler.
    const workerPlugins = filterServiceWorkerPlugins(viteConfig.plugins as unknown[])

    let adaptedPlugins: import('rolldown').Plugin[] | undefined
    if (workerPlugins && workerPlugins.length > 0) {
      try {
        const { BuildEnvironment } = await import('vite')
        const swEnvironment = new BuildEnvironment('client', viteConfig)
        await swEnvironment.init()
        adaptedPlugins = workerPlugins.map(p => injectEnvironmentToHooks(swEnvironment, p))
      } catch {
        // If BuildEnvironment is not available (older Vite), fall back to no plugins
        adaptedPlugins = undefined
      }
    }

    ctx.bundlerConfig = {
      define: sanitizeDefine(viteConfig.define),
      alias: normalizeAlias(viteConfig.resolve?.alias),
      plugins: adaptedPlugins
    }
  }
}

/**
 * Create Vite configureServer hook handler
 * NOTE: Using `unknown` type to avoid @types/node version mismatch issues between packages
 */
function createViteConfigureServer(ctx: PluginContext, options: OptionsResolved) {
  return (serverArg: unknown) => {
    const server = serverArg as ViteDevServer
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

      // Try to resolve the file path using multiple strategies
      let filePath: string | null = null

      // Strategy 1: Use Vite's resolveId
      const resolved = await server.pluginContainer.resolveId(cleanPath, undefined, {
        ssr: false
      })
      if (resolved) {
        filePath = resolved.id
      }

      // Strategy 2: Try resolving relative to project root (for test mode)
      if (!filePath && ctx.viteConfig) {
        const rootPath = path.join(ctx.viteConfig.root, cleanPath)
        try {
          const fs = await import('node:fs/promises')
          await fs.access(rootPath)
          filePath = rootPath
        } catch {
          // File doesn't exist at this path
        }
      }

      // Strategy 3: Try resolving from publicDir directly
      // Vite's publicDir serves files at root (e.g., publicDir/foo.js -> /foo.js)
      if (!filePath && ctx.viteConfig) {
        const publicDir = ctx.viteConfig.publicDir
        if (publicDir) {
          // Try direct resolution from publicDir
          const publicDirPath = path.join(publicDir, cleanPath)
          try {
            const fs = await import('node:fs/promises')
            await fs.access(publicDirPath)
            filePath = publicDirPath
          } catch {
            // File doesn't exist at this path
          }
        }
      }

      if (!filePath) {
        next()
        return
      }

      try {
        // Bundle the Service Worker with rolldown
        // Pass bundler config extracted from Vite (define, alias, plugins)
        const result = await bundleServiceWorkerWithRolldown(filePath, {
          minify: false,
          sourcemap: 'inline',
          define: ctx.bundlerConfig.define,
          alias: ctx.bundlerConfig.alias,

          plugins: resolveServiceWorkerPlugins(options.plugins, ctx.bundlerConfig.plugins)
        })

        if (!result) {
          res.statusCode = 500
          res.end('Failed to bundle Service Worker')
          return
        }

        // Send the bundled Service Worker
        if (options.serviceWorkerAllowed) {
          res.setHeader('Service-Worker-Allowed', options.serviceWorkerAllowed)
        }
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
  }
}

/**
 * Create Vite renderChunk hook handler
 */
function createViteRenderChunk(
  ctx: PluginContext,
  cache: ServiceWorkerCache,
  options: OptionsResolved
) {
  return {
    order: 'post' as const,
    async handler(code: string, _chunk: unknown) {
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
        // Pass bundler config extracted from Vite (define, alias, plugins)
        const result = await bundleServiceWorkerWithRolldown(swPath, {
          minify: ctx.viteConfig.build.minify !== false,
          sourcemap: ctx.viteConfig.build.sourcemap ? 'inline' : false,
          define: ctx.bundlerConfig.define,
          alias: ctx.bundlerConfig.alias,

          plugins: resolveServiceWorkerPlugins(options.plugins, ctx.bundlerConfig.plugins)
        })

        if (result) {
          const basename = path.basename(swPath, path.extname(swPath))
          const contentHash = generateContentHash(result.code)
          const swInfo = ctx.pendingServiceWorkers.get(swPath)
          const outputFilename = buildOutputFilename(
            basename,
            contentHash,
            swInfo?.scope,
            ctx.viteConfig.build.assetsDir
          )

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
  }
}

/**
 * Create Vite generateBundle hook handler
 */
function createViteGenerateBundle(
  ctx: PluginContext,
  cache: ServiceWorkerCache,
  options: OptionsResolved
) {
  return async function (
    this: {
      emitFile: (file: { type: 'asset'; fileName: string; source: string | Uint8Array }) => string
    },
    _opts: unknown,
    bundle: Record<string, unknown>
  ) {
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
      // Pass bundler config extracted from Vite (define, alias, plugins)
      const result = await bundleServiceWorkerWithRolldown(swPath, {
        minify: ctx.viteConfig.build.minify !== false,
        sourcemap: ctx.viteConfig.build.sourcemap ? 'inline' : false,
        define: ctx.bundlerConfig.define,
        alias: ctx.bundlerConfig.alias,

        plugins: resolveServiceWorkerPlugins(options.plugins, ctx.bundlerConfig.plugins)
      })

      if (result) {
        const basename = path.basename(swPath, path.extname(swPath))
        // Generate content hash for filename
        const contentHash = generateContentHash(result.code)
        const swInfo = ctx.pendingServiceWorkers.get(swPath)
        const outputFilename = buildOutputFilename(
          basename,
          contentHash,
          swInfo?.scope,
          ctx.viteConfig.build.assetsDir
        )

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
}

/**
 * esmbuild-specific Functions
 */

/**
 * Setup esbuild hooks for Service Worker bundling
 */
function setupEsbuildHooks(build: EsbuildPluginBuild, options: OptionsResolved): void {
  const pendingServiceWorkers = new Map<string, ResolvedServiceWorker>()
  const processedFiles = new Map<string, string>() // swPath -> outputFileName

  // Extract bundler config from esbuild
  const bundlerConfig: ServiceWorkerBundlerConfig = {
    define: sanitizeDefine(build.initialOptions.define),
    alias: normalizeAlias(build.initialOptions.alias)
  }

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
    const outdir = path.isAbsolute(rawOutdir) ? rawOutdir : path.resolve(absWorkingDir, rawOutdir)

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
      // Pass bundler config extracted from esbuild (define, alias) and user plugins
      const bundleResult = await bundleServiceWorkerWithRolldown(swPath, {
        minify: build.initialOptions.minify ?? false,
        sourcemap: normalizedSourcemap ?? false,
        define: bundlerConfig.define,
        alias: bundlerConfig.alias,

        plugins: resolveServiceWorkerPlugins(options.plugins, bundlerConfig.plugins)
      })

      if (!bundleResult) {
        console.error(`[unplugin-service-worker] Failed to bundle: ${swPath}`)
        continue
      }

      // Generate output filename with content hash
      const contentHash = generateContentHash(bundleResult.code)
      const baseName = path.basename(swPath, path.extname(swPath))
      const swInfo = pendingServiceWorkers.get(swPath)
      const outputFileName = buildOutputFilename(baseName, contentHash, swInfo?.scope, '')

      processedFiles.set(swPath, outputFileName)

      // Write Service Worker file
      const fs = await import('node:fs/promises')
      const outputPath = path.join(outdir, outputFileName)
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.writeFile(outputPath, bundleResult.code)
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

/**
 * Farm-specific Functions
 */

/**
 * Create Farm finish hook executor
 */
function createFarmFinishExecutor(
  ctx: PluginContext,
  cache: ServiceWorkerCache,
  isFarm: boolean,
  options: OptionsResolved
) {
  return async function () {
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
      const possibleDirs = [path.join(outputDir, 'dist'), path.join(outputDir, '.output', 'farm')]

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
      // Pass bundler config extracted from Farm (define, alias) and user plugins
      const result = await bundleServiceWorkerWithRolldown(swPath, {
        minify: false,
        sourcemap: false,
        define: ctx.bundlerConfig.define,
        alias: ctx.bundlerConfig.alias,

        plugins: resolveServiceWorkerPlugins(options.plugins, ctx.bundlerConfig.plugins)
      })

      if (result) {
        const basename = path.basename(swPath, path.extname(swPath))
        const contentHash = generateContentHash(result.code)
        const swInfo = ctx.pendingServiceWorkers.get(swPath)
        const outputFilename = buildOutputFilename(basename, contentHash, swInfo?.scope, 'assets')

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

/**
 * Plugin entry point
 */

export const ServiceWorkerPlugin: UnpluginInstance<Options | undefined, false> = createUnplugin(
  (rawOptions = {}, meta) => {
    const options = resolveOptions(rawOptions)
    const cache = createServiceWorkerCache()

    const ctx: PluginContext = {
      viteConfig: null,
      isBuild: false,
      isTest: false,
      cache,
      rollupReferenceIds: new Map(),
      pendingServiceWorkers: new Map(),
      bundlerConfig: {}
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
                  const hashStr = generatePlaceholderHash(sw.filePath)
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

                // In test environment (Vitest browser mode), use self.location.href directly
                // because import.meta.url contains file system paths that don't resolve correctly.
                // Vitest's NormalizeURLPlugin is supposed to transform import.meta.url to self.location,
                // but it may not run due to environment.name check.
                // In regular dev mode, use import.meta.url with /* @vite-ignore */ comment.
                const urlExpr = ctx.isTest
                  ? `new URL(${JSON.stringify(devUrl)}, self.location.href)`
                  : `new URL(/* @vite-ignore */ ${JSON.stringify(devUrl)}, '' + import.meta.url)`
                s.update(sw.detected.startIndex, sw.detected.endIndex, urlExpr)
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
        options(inputOptions) {
          // Extract bundler config from Rollup
          ctx.bundlerConfig = {
            plugins: filterServiceWorkerPlugins(inputOptions.plugins as unknown[])
          }
        },
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
        options(inputOptions) {
          // Extract bundler config from Rolldown
          ctx.bundlerConfig = {
            define: sanitizeDefine(
              (inputOptions.transform as { define?: Record<string, unknown> } | undefined)?.define
            ),
            alias: normalizeAlias((inputOptions.resolve as { alias?: unknown } | undefined)?.alias),
            plugins: filterServiceWorkerPlugins(inputOptions.plugins as unknown[])
          }
        },
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
        configResolved: createViteConfigResolved(ctx),
        configureServer: createViteConfigureServer(ctx, options),
        renderChunk: createViteRenderChunk(ctx, cache, options),
        generateBundle: createViteGenerateBundle(ctx, cache, options)
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
          setupEsbuildHooks(build, options)
        }
      },

      // Farm-specific hooks
      farm: {
        configResolved(config) {
          // Extract bundler config from Farm
          ctx.bundlerConfig = {
            define: sanitizeDefine(
              (config.compilation as { define?: Record<string, unknown> } | undefined)?.define
            ),
            alias: normalizeAlias(
              (config.compilation as { resolve?: { alias?: unknown } } | undefined)?.resolve?.alias
            )
          }
        },
        finish: {
          executor: createFarmFinishExecutor(ctx, cache, isFarm, options)
        }
      }
    }
  }
)

// Re-export for convenience
export { type ServiceWorkerCache } from './core/cache.ts'
export { type Options } from './core/options.ts'

/**
 * @internal Exported for testing purposes only.
 */
export { createViteQueryPlugin, filterServiceWorkerPlugins, resolveServiceWorkerPlugins }
