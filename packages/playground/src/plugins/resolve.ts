import type { PartialResolvedId } from '@rolldown/browser'
import type { Plugin, ResolveOptions } from 'vite'
import type { DepsOptimizer } from '../optimizer/index.ts'
import type { PackageCache } from '../packages.ts'

export interface EnvironmentResolveOptions {
  /**
   * @default ['browser', 'module', 'jsnext:main', 'jsnext']
   */
  mainFields?: string[]
  conditions?: string[]
  externalConditions?: string[]
  /**
   * @default ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
   */
  extensions?: string[]
  dedupe?: string[]
  // TODO: better abstraction that works for the client environment too?
  /**
   * Prevent listed dependencies from being externalized and will get bundled in build.
   * Only works in server environments for now. Previously this was `ssr.noExternal`.
   * @experimental
   */
  noExternal?: string | RegExp | (string | RegExp)[] | true
  /**
   * Externalize the given dependencies and their transitive dependencies.
   * Only works in server environments for now. Previously this was `ssr.external`.
   * @experimental
   */
  external?: string[] | true
  /**
   * Array of strings or regular expressions that indicate what modules are builtin for the environment.
   */
  builtins?: (string | RegExp)[]
}

interface ResolvePluginOptions {
  root: string
  isBuild: boolean
  isProduction: boolean
  packageCache?: PackageCache
  /**
   * src code mode also attempts the following:
   * - resolving /xxx as URLs
   * - resolving bare imports from optimized deps
   */
  asSrc?: boolean
  tryIndex?: boolean
  tryPrefix?: string
  preferRelative?: boolean
  isRequire?: boolean
  // True when resolving during the scan phase to discover dependencies
  scan?: boolean
  /**
   * @internal
   */
  skipMainField?: boolean

  /**
   * Optimize deps during dev, defaults to false // TODO: Review default
   * @internal
   */
  optimizeDeps?: boolean

  /**
   * Externalize using `resolve.external` and `resolve.noExternal` when running a build in
   * a server environment. Defaults to false (only for createResolver)
   * @internal
   */
  externalize?: boolean

  /**
   * Set by createResolver, we only care about the resolved id. moduleSideEffects
   * and other fields are discarded so we can avoid computing them.
   * @internal
   */
  idOnly?: boolean

  /**
   * Set by `nodeResolveWithVite`, disables optional peer dependency handling.
   * @internal
   */
  disableOptionalPeerDepHandling?: boolean

  /**
   * Enable when `legacy.inconsistentCjsInterop` is true. See that option for more details.
   */
  legacyInconsistentCjsInterop?: boolean
}

export interface InternalResolveOptions extends Required<ResolveOptions>, ResolvePluginOptions {}

// Defined ResolveOptions are used to overwrite the values for all environments
// It is used when creating custom resolvers (for CSS, scanning, etc)
export interface ResolvePluginOptionsWithOverrides extends ResolveOptions, ResolvePluginOptions {}

// ---

export function tryNodeResolve(
  id: string,
  importer: string | null | undefined,
  options: InternalResolveOptions,
  depsOptimizer?: DepsOptimizer,
  externalize?: boolean
): PartialResolvedId | undefined {
  return undefined

  //   const { root, dedupe, isBuild, preserveSymlinks, packageCache } = options
  //
  //   // check for deep import, e.g. "my-lib/foo"
  //   const deepMatch = deepImportRE.exec(id)
  //   // package name doesn't include postfixes
  //   // trim them to support importing package with queries (e.g. `import css from 'normalize.css?inline'`)
  //   const pkgId = deepMatch ? deepMatch[1] || deepMatch[2] : cleanUrl(id)
  //
  //   let basedir: string
  //   if (dedupe.includes(pkgId)) {
  //     basedir = root
  //   } else if (
  //     importer &&
  //     path.isAbsolute(importer) &&
  //     // css processing appends `*` for importer
  //     (importer.endsWith('*') || fs.existsSync(cleanUrl(importer)))
  //   ) {
  //     basedir = path.dirname(importer)
  //   } else {
  //     basedir = root
  //   }
  //
  //   const isModuleBuiltin = (id: string) => isBuiltin(options.builtins, id)
  //
  //   let selfPkg = null
  //   if (!isModuleBuiltin(id) && !id.includes('\0') && bareImportRE.test(id)) {
  //     // check if it's a self reference dep.
  //     const selfPackageData = findNearestPackageData(basedir, packageCache)
  //     selfPkg =
  //       selfPackageData?.data.exports && selfPackageData.data.name === pkgId
  //         ? selfPackageData
  //         : null
  //   }
  //
  //   const pkg =
  //     selfPkg ||
  //     resolvePackageData(pkgId, basedir, preserveSymlinks, packageCache)
  //   if (!pkg) {
  //     // if import can't be found, check if it's an optional peer dep.
  //     // if so, we can resolve to a special id that errors only when imported.
  //     if (
  //       !options.disableOptionalPeerDepHandling &&
  //       basedir !== root && // root has no peer dep
  //       !isModuleBuiltin(id) &&
  //       !id.includes('\0') &&
  //       bareImportRE.test(id)
  //     ) {
  //       const mainPkg = findNearestMainPackageData(basedir, packageCache)?.data
  //       if (mainPkg) {
  //         const pkgName = getNpmPackageName(id)
  //         if (
  //           pkgName != null &&
  //           mainPkg.peerDependencies?.[pkgName] &&
  //           mainPkg.peerDependenciesMeta?.[pkgName]?.optional
  //         ) {
  //           return {
  //             id: `${optionalPeerDepId}:${id}:${mainPkg.name}`,
  //           }
  //         }
  //       }
  //     }
  //     return
  //   }
  //
  //   const resolveId = deepMatch ? resolveDeepImport : resolvePackageEntry
  //   const unresolvedId = deepMatch ? '.' + id.slice(pkgId.length) : id
  //
  //   let resolved = resolveId(unresolvedId, pkg, options, externalize)
  //   if (!resolved) {
  //     return
  //   }
  //
  //   const processResult = (resolved: PartialResolvedId) => {
  //     if (!externalize) {
  //       return resolved
  //     }
  //     if (!canExternalizeFile(resolved.id)) {
  //       return resolved
  //     }
  //
  //     let resolvedId = id
  //     if (
  //       deepMatch &&
  //       !pkg.data.exports &&
  //       path.extname(id) !== path.extname(resolved.id)
  //     ) {
  //       // id date-fns/locale
  //       // resolve.id ...date-fns/esm/locale/index.js
  //       const index = resolved.id.indexOf(id)
  //       if (index > -1) {
  //         resolvedId = resolved.id.slice(index)
  //         debug?.(
  //           `[processResult] ${colors.cyan(id)} -> ${colors.dim(resolvedId)}`,
  //         )
  //       }
  //     }
  //     return { ...resolved, id: resolvedId, external: true }
  //   }
  //
  //   if (!options.idOnly && ((!options.scan && isBuild) || externalize)) {
  //     // Resolve package side effects for build so that rollup can better
  //     // perform tree-shaking
  //     return processResult({
  //       id: resolved,
  //       moduleSideEffects: pkg.hasSideEffects(resolved),
  //       packageJsonPath: findNearestPackagePath(
  //         resolved,
  //         options.legacyInconsistentCjsInterop,
  //         options.packageCache,
  //         isBuild,
  //       ),
  //     })
  //   }
  //
  //   if (
  //     !isInNodeModules(resolved) || // linked
  //     !depsOptimizer || // resolving before listening to the server
  //     options.scan // initial esbuild scan phase
  //   ) {
  //     return { id: resolved }
  //   }
  //
  //   // if we reach here, it's a valid dep import that hasn't been optimized.
  //   const isJsType = isOptimizable(resolved, depsOptimizer.options)
  //   const exclude = depsOptimizer.options.exclude
  //
  //   const skipOptimization =
  //     depsOptimizer.options.noDiscovery ||
  //     !isJsType ||
  //     (importer && isInNodeModules(importer)) ||
  //     exclude?.includes(pkgId) ||
  //     exclude?.includes(id) ||
  //     SPECIAL_QUERY_RE.test(resolved)
  //
  //   if (skipOptimization) {
  //     // excluded from optimization
  //     // Inject a version query to npm deps so that the browser
  //     // can cache it without re-validation, but only do so for known js types.
  //     // otherwise we may introduce duplicated modules for externalized files
  //     // from pre-bundled deps.
  //     const versionHash = depsOptimizer.metadata.browserHash
  //     if (versionHash && isJsType) {
  //       resolved = injectQuery(resolved, `v=${versionHash}`)
  //     }
  //   } else {
  //     // this is a missing import, queue optimize-deps re-run and
  //     // get a resolved its optimized info
  //     const optimizedInfo = depsOptimizer.registerMissingImport(id, resolved)
  //     resolved = depsOptimizer.getOptimizedDepId(optimizedInfo)
  //   }
  //
  //   return { id: resolved }
}

// ---

// ---

export function resolvePlugin(resolveOptions: ResolvePluginOptionsWithOverrides): Plugin {
  // ---

  return {
    name: 'vite:resolve'
    // ---
  }
}
