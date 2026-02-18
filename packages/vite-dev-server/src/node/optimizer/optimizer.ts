// import colors from 'picocolors'
import { createDebugger } from '../utils'
// import {
//   type PromiseWithResolvers,
//   promiseWithResolvers,
// } from '../../shared/utils'
import type { DevEnvironment } from '../server/environment'
// import { devToScanEnvironment } from './scan'
// import {
//   addManuallyIncludedOptimizeDeps,
//   addOptimizedDepInfo,
//   createIsOptimizedDepFile,
//   createIsOptimizedDepUrl,
//   depsFromOptimizedDepInfo,
//   depsLogString,
//   discoverProjectDependencies,
//   extractExportsData,
//   getOptimizedDepPath,
//   initDepsOptimizerMetadata,
//   loadCachedDepOptimizationMetadata,
//   optimizeExplicitEnvironmentDeps,
//   runOptimizeDeps,
//   toDiscoveredDependencies,
// } from './index'
import type {
  // DepOptimizationMetadata,
  // DepOptimizationResult,
  DepsOptimizer,
} from './index'

const debug = createDebugger('vite:deps')

/**
 * The amount to wait for requests to register newly found dependencies before triggering
 * a re-bundle + page reload
 */
const debounceMs = 100

export function createDepsOptimizer(
  environment: DevEnvironment,
): DepsOptimizer {
  return {} as DepsOptimizer
}

export function createExplicitDepsOptimizer(
  environment: DevEnvironment,
): DepsOptimizer {
  const depsOptimizer = {
    // metadata: initDepsOptimizerMetadata(environment),
    // isOptimizedDepFile: createIsOptimizedDepFile(environment),
    // isOptimizedDepUrl: createIsOptimizedDepUrl(environment),
    // getOptimizedDepId: (depInfo: OptimizedDepInfo) =>
    //   `${depInfo.file}?v=${depInfo.browserHash}`,

    // registerMissingImport: () => {
    //   throw new Error(
    //     `Vite Internal Error: registerMissingImport is not supported in dev ${environment.name}`,
    //   )
    // },
    // init,
    // // noop, there is no scanning during dev SSR
    // // the optimizer blocks the server start
    // run: () => { },

    // close: async () => { },
    // options: environment.config.optimizeDeps,
  } as DepsOptimizer

  let inited = false
  async function init() {
    if (inited) {return}
    inited = true

    // depsOptimizer.metadata = await optimizeExplicitEnvironmentDeps(environment)
  }

  return depsOptimizer
}
