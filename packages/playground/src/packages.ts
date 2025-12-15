import type { InternalResolveOptions, Plugin } from 'vite'

/** Cache for package.json resolution and package.json contents */
export type PackageCache = Map<string, PackageData>

interface PackageData {
  dir: string
  hasSideEffects: (id: string) => boolean | 'no-treeshake' | null
  setResolvedCache: (key: string, entry: string, options: InternalResolveOptions) => void
  getResolvedCache: (key: string, options: InternalResolveOptions) => string | undefined
  data: {
    [field: string]: any
    name: string
    type: string
    version: string
    main: string
    module: string
    browser: string | Record<string, string | false>
    exports: string | Record<string, any> | string[]
    imports: Record<string, any>
    dependencies: Record<string, string>
  }
}

// ---

export function findNearestPackageData(
  basedir: string,
  packageCache?: PackageCache
): PackageData | null {
  const originalBasedir = basedir
  // while (basedir) {
  //   if (packageCache) {
  //     const cached = getFnpdCache(packageCache, basedir, originalBasedir)
  //     if (cached) return cached
  //   }

  //   const pkgPath = path.join(basedir, 'package.json')
  //   if (tryStatSync(pkgPath)?.isFile()) {
  //     try {
  //       const pkgData = loadPackageData(pkgPath)

  //       if (packageCache) {
  //         setFnpdCache(packageCache, pkgData, basedir, originalBasedir)
  //       }

  //       return pkgData
  //     } catch { }
  //   }

  //   const nextBasedir = path.dirname(basedir)
  //   if (nextBasedir === basedir) break
  //   basedir = nextBasedir
  // }

  return null
}

// ---

export function watchPackageDataPlugin(packageCache: PackageCache): Plugin {
  // ---

  return {
    name: 'vite:watch-package-data'

    // ---
  }
}

// ---
