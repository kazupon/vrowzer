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
  // TODO: fill in later
}

// TODO: fill in later

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
