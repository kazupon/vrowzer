import type { DepOptimizationMetadata, DepOptimizationOptions, OptimizedDepInfo } from 'vite'

// ---

export interface DepsOptimizer {
  init: () => Promise<void>
  metadata: DepOptimizationMetadata
  scanProcessing?: Promise<void>
  registerMissingImport: (id: string, resolved: string) => OptimizedDepInfo
  run: () => void
  isOptimizedDepFile: (id: string) => boolean
  isOptimizedDepUrl: (url: string) => boolean
  getOptimizedDepId: (depInfo: OptimizedDepInfo) => string
  close: () => Promise<void>
  options: DepOptimizationOptions
}

// ---

export function isDepOptimizationDisabled(optimizeDeps: DepOptimizationOptions): boolean {
  return (
    optimizeDeps.disabled === true ||
    optimizeDeps.disabled === 'dev' ||
    (!!optimizeDeps.noDiscovery && !optimizeDeps.include?.length)
  )
}
// ---
