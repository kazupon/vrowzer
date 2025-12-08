import type { InternalResolveOptions } from 'vite'

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
