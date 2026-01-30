import fs from 'node:fs'
import path from 'node:path'
import colors from 'picocolors'
import type { PartialResolvedId } from 'rolldown'
import {
  cleanUrl,
  splitFileAndPostfix
} from '../../shared/utils'
import {
  CLIENT_ENTRY,
  ENV_ENTRY,
  SPECIAL_QUERY_RE
} from '../constants'
import { canExternalizeFile } from '../external'
import type { DepsOptimizer } from '../optimizer'
import type { PackageCache, PackageData } from '../packages'
import {
  findNearestMainPackageData,
  findNearestPackageData,
  resolvePackageData
} from '../packages'
import {
  bareImportRE,
  createDebugger,
  deepImportRE,
  getNpmPackageName,
  injectQuery,
  isBuiltin,
  isInNodeModules,
  isObject,
  isOptimizable,
  normalizePath
} from '../utils'

const normalizedClientEntry = normalizePath(CLIENT_ENTRY)
const normalizedEnvEntry = normalizePath(ENV_ENTRY)

const ERR_RESOLVE_PACKAGE_ENTRY_FAIL = 'ERR_RESOLVE_PACKAGE_ENTRY_FAIL'

// special id for paths marked with browser: false
// https://github.com/defunctzombie/package-browser-field-spec#ignore-a-module
export const browserExternalId = '__vite-browser-external'
// special id for packages that are optional peer deps
export const optionalPeerDepId = '__vite-optional-peer-dep'

const subpathImportsPrefix = '#'

const relativePrefixRE = /^\.\.?(?:[/\\]|$)/
const startsWithWordCharRE = /^\w/

const debug = createDebugger('vite:resolve-details', {
  onlyWhenFocused: true,
})

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

export interface ResolveOptions extends EnvironmentResolveOptions {
  /**
   * @default false
   */
  preserveSymlinks?: boolean
  /**
   * Enable tsconfig paths resolution
   *
   * This option does not have any effect if `experimental.enableNativePlugin` is set to `false`.
   *
   * @default false
   * @experimental
   */
  tsconfigPaths?: boolean
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

export interface InternalResolveOptions
  extends Required<ResolveOptions>, ResolvePluginOptions { }

// Defined ResolveOptions are used to overwrite the values for all environments
// It is used when creating custom resolvers (for CSS, scanning, etc)
export interface ResolvePluginOptionsWithOverrides
  extends ResolveOptions, ResolvePluginOptions { }

// TODO: fill in later ...

export function tryNodeResolve(
  id: string,
  importer: string | null | undefined,
  options: InternalResolveOptions,
  depsOptimizer?: DepsOptimizer,
  externalize?: boolean,
): PartialResolvedId | undefined {
  const { root, dedupe, isBuild, preserveSymlinks, packageCache } = options

  // check for deep import, e.g. "my-lib/foo"
  const deepMatch = deepImportRE.exec(id)
  // package name doesn't include postfixes
  // trim them to support importing package with queries (e.g. `import css from 'normalize.css?inline'`)
  const pkgId = deepMatch ? deepMatch[1] || deepMatch[2] : cleanUrl(id)

  let basedir: string
  if (dedupe.includes(pkgId)) {
    basedir = root
  } else if (
    importer &&
    path.isAbsolute(importer) &&
    // css processing appends `*` for importer
    (importer.endsWith('*') || fs.existsSync(cleanUrl(importer)))
  ) {
    basedir = path.dirname(importer)
  } else {
    basedir = root
  }

  const isModuleBuiltin = (id: string) => isBuiltin(options.builtins, id)

  let selfPkg = null
  if (!isModuleBuiltin(id) && !id.includes('\0') && bareImportRE.test(id)) {
    // check if it's a self reference dep.
    const selfPackageData = findNearestPackageData(basedir, packageCache)
    selfPkg =
      selfPackageData?.data.exports && selfPackageData.data.name === pkgId
        ? selfPackageData
        : null
  }

  const pkg =
    selfPkg ||
    resolvePackageData(pkgId, basedir, preserveSymlinks, packageCache)
  if (!pkg) {
    // if import can't be found, check if it's an optional peer dep.
    // if so, we can resolve to a special id that errors only when imported.
    if (
      !options.disableOptionalPeerDepHandling &&
      basedir !== root && // root has no peer dep
      !isModuleBuiltin(id) &&
      !id.includes('\0') &&
      bareImportRE.test(id)
    ) {
      const mainPkg = findNearestMainPackageData(basedir, packageCache)?.data
      if (mainPkg) {
        const pkgName = getNpmPackageName(id)
        if (
          pkgName != null &&
          mainPkg.peerDependencies?.[pkgName] &&
          mainPkg.peerDependenciesMeta?.[pkgName]?.optional
        ) {
          return {
            id: `${optionalPeerDepId}:${id}:${mainPkg.name}`,
          }
        }
      }
    }
    return
  }

  const resolveId = deepMatch ? resolveDeepImport : resolvePackageEntry
  const unresolvedId = deepMatch ? '.' + id.slice(pkgId.length) : id

  let resolved = resolveId(unresolvedId, pkg, options, externalize)
  if (!resolved) {
    return
  }

  const processResult = (resolved: PartialResolvedId) => {
    if (!externalize) {
      return resolved
    }
    if (!canExternalizeFile(resolved.id)) {
      return resolved
    }

    let resolvedId = id
    if (
      deepMatch &&
      !pkg.data.exports &&
      path.extname(id) !== path.extname(resolved.id)
    ) {
      // id date-fns/locale
      // resolve.id ...date-fns/esm/locale/index.js
      const index = resolved.id.indexOf(id)
      if (index > -1) {
        resolvedId = resolved.id.slice(index)
        debug?.(
          `[processResult] ${colors.cyan(id)} -> ${colors.dim(resolvedId)}`,
        )
      }
    }
    return { ...resolved, id: resolvedId, external: true }
  }

  if (!options.idOnly && ((!options.scan && isBuild) || externalize)) {
    // Resolve package side effects for build so that rollup can better
    // perform tree-shaking
    return processResult({
      id: resolved,
      moduleSideEffects: pkg.hasSideEffects(resolved),
      packageJsonPath: findNearestPackagePath(
        resolved,
        options.legacyInconsistentCjsInterop,
        options.packageCache,
        isBuild,
      ),
    })
  }

  if (
    !isInNodeModules(resolved) || // linked
    !depsOptimizer || // resolving before listening to the server
    options.scan // initial esbuild scan phase
  ) {
    return { id: resolved }
  }

  // if we reach here, it's a valid dep import that hasn't been optimized.
  const isJsType = isOptimizable(resolved, depsOptimizer.options)
  const exclude = depsOptimizer.options.exclude

  const skipOptimization =
    depsOptimizer.options.noDiscovery ||
    !isJsType ||
    (importer && isInNodeModules(importer)) ||
    exclude?.includes(pkgId) ||
    exclude?.includes(id) ||
    SPECIAL_QUERY_RE.test(resolved)

  if (skipOptimization) {
    // excluded from optimization
    // Inject a version query to npm deps so that the browser
    // can cache it without re-validation, but only do so for known js types.
    // otherwise we may introduce duplicated modules for externalized files
    // from pre-bundled deps.
    const versionHash = depsOptimizer.metadata.browserHash
    if (versionHash && isJsType) {
      resolved = injectQuery(resolved, `v=${versionHash}`)
    }
  } else {
    // this is a missing import, queue optimize-deps re-run and
    // get a resolved its optimized info
    const optimizedInfo = depsOptimizer.registerMissingImport(id, resolved)
    resolved = depsOptimizer.getOptimizedDepId(optimizedInfo)
  }

  return { id: resolved }
}

// TODO: fill in later ...

export function resolvePackageEntry(
  id: string,
  { dir, data, setResolvedCache, getResolvedCache }: PackageData,
  options: InternalResolveOptions,
  externalize?: boolean,
): string | undefined {
  const { file: idWithoutPostfix, postfix } = splitFileAndPostfix(id)

  const cached = getResolvedCache('.', options)
  if (cached) {
    return cached + postfix
  }

  try {
    let entryPoint: string | undefined

    // resolve exports field with highest priority
    // using https://github.com/lukeed/resolve.exports
    if (data.exports) {
      entryPoint = resolveExportsOrImports(
        data,
        '.',
        options,
        'exports',
        externalize,
      )
    }

    // fallback to mainFields if still not resolved
    if (!entryPoint) {
      for (const field of options.mainFields) {
        if (field === 'browser') {
          entryPoint = tryResolveBrowserEntry(dir, data, options)
          if (entryPoint) {
            break
          }
        } else if (typeof data[field] === 'string') {
          entryPoint = data[field]
          break
        }
      }
    }
    entryPoint ||= data.main

    // try default entry when entry is not define
    // https://nodejs.org/api/modules.html#all-together
    const entryPoints = entryPoint
      ? [entryPoint]
      : ['index.js', 'index.json', 'index.node']

    for (let entry of entryPoints) {
      // make sure we don't get scripts when looking for sass
      let skipPackageJson = false
      if (
        options.mainFields[0] === 'sass' &&
        !options.extensions.includes(path.extname(entry))
      ) {
        entry = ''
        skipPackageJson = true
      } else {
        // resolve object browser field in package.json
        const { browser: browserField } = data
        if (options.mainFields.includes('browser') && isObject(browserField)) {
          entry = mapWithBrowserField(entry, browserField) || entry
        }
      }

      const entryPointPath = path.join(dir, entry)
      const resolvedEntryPoint = tryFsResolve(
        entryPointPath,
        options,
        true,
        skipPackageJson,
      )
      if (resolvedEntryPoint) {
        debug?.(
          `[package entry] ${colors.cyan(idWithoutPostfix)} -> ${colors.dim(
            resolvedEntryPoint,
          )}${postfix !== '' ? ` (postfix: ${postfix})` : ''}`,
        )
        setResolvedCache('.', resolvedEntryPoint, options)
        return resolvedEntryPoint + postfix
      }
    }
  } catch (e) {
    packageEntryFailure(id, e.message)
  }
  packageEntryFailure(id)
}

// TODO: fill in later ...

function resolveDeepImport(
  id: string,
  { setResolvedCache, getResolvedCache, dir, data }: PackageData,
  options: InternalResolveOptions,
  externalize?: boolean,
): string | undefined {
  const cache = getResolvedCache(id, options)
  if (cache) {
    return cache
  }

  let relativeId: string | undefined | void = id
  const { exports: exportsField, browser: browserField } = data

  // map relative based on exports data
  if (exportsField) {
    if (isObject(exportsField) && !Array.isArray(exportsField)) {
      // resolve without postfix (see #7098)
      const { file, postfix } = splitFileAndPostfix(relativeId)
      const exportsId = resolveExportsOrImports(
        data,
        file,
        options,
        'exports',
        externalize,
      )
      if (exportsId !== undefined) {
        relativeId = exportsId + postfix
      } else {
        relativeId = undefined
      }
    } else {
      // not exposed
      relativeId = undefined
    }
    if (!relativeId) {
      throw new Error(
        `Package subpath '${relativeId}' is not defined by "exports" in ` +
        `${path.join(dir, 'package.json')}.`,
      )
    }
  } else if (options.mainFields.includes('browser') && isObject(browserField)) {
    // resolve without postfix (see #7098)
    const { file, postfix } = splitFileAndPostfix(relativeId)
    const mapped = mapWithBrowserField(file, browserField)
    if (mapped) {
      relativeId = mapped + postfix
    } else if (mapped === false) {
      setResolvedCache(id, browserExternalId, options)
      return browserExternalId
    }
  }

  if (relativeId) {
    const resolved = tryFsResolve(
      path.join(dir, relativeId),
      options,
      !exportsField, // try index only if no exports field
    )
    if (resolved) {
      debug?.(
        `[node/deep-import] ${colors.cyan(id)} -> ${colors.dim(resolved)}`,
      )
      setResolvedCache(id, resolved, options)
      return resolved
    }
  }
}

// TODO: fill in later ...

function findNearestPackagePath(
  file: string,
  legacyInconsistentCjsInterop: boolean | undefined,
  packageCache: PackageCache | undefined,
  isBuild: boolean,
) {
  if (!isBuild || legacyInconsistentCjsInterop) return
  const pkgData = findNearestPackageData(file, packageCache)
  return pkgData ? path.join(pkgData.dir, 'package.json') : null
}
