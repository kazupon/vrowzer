import type { DepsOptimizerEsbuildOptions } from '#types/internal/esbuildOptions'
import type {
  RolldownOptions,
  OutputOptions as RolldownOutputOptions
} from 'rolldown'

// TODO: fill in later

export interface DepsOptimizer {
  init: () => Promise<void>

  // NOTE(kazupon): disalbe now, enable later
  // metadata: DepOptimizationMetadata
  scanProcessing?: Promise<void>
  // NOTE(kazupon): disalbe now, enable later
  // registerMissingImport: (id: string, resolved: string) => OptimizedDepInfo
  run: () => void

  isOptimizedDepFile: (id: string) => boolean
  isOptimizedDepUrl: (url: string) => boolean
  // NOTE(kazupon): disalbe now, enable later
  // getOptimizedDepId: (depInfo: OptimizedDepInfo) => string

  close: () => Promise<void>

  options: DepOptimizationOptions
}

export interface DepOptimizationConfig {
  /**
    * Force optimize listed dependencies (must be resolvable import paths,
    * cannot be globs).
    */
  include?: string[]
  /**
   * Do not optimize these dependencies (must be resolvable import paths,
   * cannot be globs).
   */
  exclude?: string[]
  /**
   * Forces ESM interop when importing these dependencies. Some legacy
   * packages advertise themselves as ESM but use `require` internally
   * @experimental
   */
  needsInterop?: string[]
  /**
   * Options to pass to esbuild during the dep scanning and optimization
   *
   * Certain options are omitted since changing them would not be compatible
   * with Vite's dep optimization.
   *
   * - `external` is also omitted, use Vite's `optimizeDeps.exclude` option
   * - `plugins` are merged with Vite's dep plugin
   *
   * https://esbuild.github.io/api
   *
   * @deprecated Use `rolldownOptions` instead.
   */
  esbuildOptions?: DepsOptimizerEsbuildOptions
  /**
   * @deprecated Use `rolldownOptions` instead.
   */
  rollupOptions?: Omit<RolldownOptions, 'input' | 'logLevel' | 'output'> & {
    output?: Omit<
      RolldownOutputOptions,
      'format' | 'sourcemap' | 'dir' | 'banner'
    >
  }
  /**
   * Options to pass to rolldown during the dep scanning and optimization
   *
   * Certain options are omitted since changing them would not be compatible
   * with Vite's dep optimization.
   *
   * - `plugins` are merged with Vite's dep plugin
   */
  rolldownOptions?: Omit<RolldownOptions, 'input' | 'logLevel' | 'output'> & {
    output?: Omit<
      RolldownOutputOptions,
      'format' | 'sourcemap' | 'dir' | 'banner'
    >
  }
  /**
   * List of file extensions that can be optimized. A corresponding esbuild
   * plugin must exist to handle the specific extension.
   *
   * By default, Vite can optimize `.mjs`, `.js`, `.ts`, and `.mts` files. This option
   * allows specifying additional extensions.
   *
   * @experimental
   */
  extensions?: string[]
  /**
   * Deps optimization during build was removed in Vite 5.1. This option is
   * now redundant and will be removed in a future version. Switch to using
   * `optimizeDeps.noDiscovery` and an empty or undefined `optimizeDeps.include`.
   * true or 'dev' disables the optimizer, false or 'build' leaves it enabled.
   * @default 'build'
   * @deprecated
   * @experimental
   */
  disabled?: boolean | 'build' | 'dev'
  /**
   * Automatic dependency discovery. When `noDiscovery` is true, only dependencies
   * listed in `include` will be optimized. The scanner isn't run for cold start
   * in this case. CJS-only dependencies must be present in `include` during dev.
   * @default false
   */
  noDiscovery?: boolean
  /**
   * When enabled, it will hold the first optimized deps results until all static
   * imports are crawled on cold start. This avoids the need for full-page reloads
   * when new dependencies are discovered and they trigger the generation of new
   * common chunks. If all dependencies are found by the scanner plus the explicitly
   * defined ones in `include`, it is better to disable this option to let the
   * browser process more requests in parallel.
   * @default true
   * @experimental
   */
  holdUntilCrawlEnd?: boolean
  /**
   * When enabled, Vite will not throw an error when an outdated optimized
   * dependency is requested. Enabling this option may cause a single module
   * to have a multiple reference.
   * @default false
   * @experimental
   */
  ignoreOutdatedRequests?: boolean
}

export type DepOptimizationOptions = DepOptimizationConfig & {
  /**
   * By default, Vite will crawl your `index.html` to detect dependencies that
   * need to be pre-bundled. If `build.rollupOptions.input` is specified, Vite
   * will crawl those entry points instead.
   *
   * If neither of these fit your needs, you can specify custom entries using
   * this option - the value should be a tinyglobby pattern or array of patterns
   * (https://github.com/SuperchupuDev/tinyglobby) that are relative from
   * vite project root. This will overwrite default entries inference.
   */
  entries?: string | string[]
  /**
   * Force dep pre-optimization regardless of whether deps have changed.
   * @experimental
   */
  force?: boolean
}

export function isDepOptimizationDisabled(
  optimizeDeps: DepOptimizationOptions,
): boolean {
  return (
    optimizeDeps.disabled === true ||
    optimizeDeps.disabled === 'dev' ||
    (!!optimizeDeps.noDiscovery && !optimizeDeps.include?.length)
  )
}

// TOOD: fill in later ...
