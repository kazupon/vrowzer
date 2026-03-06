/**
 * vrowser config types and helpers
 *
 * @module config
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { UserConfig } from 'vite'

/**
 * Configuration for vrowser.
 * Extends Vite's UserConfig with vrowser-specific options.
 */
export interface VrowserConfig extends UserConfig {
  basePath?: string
  serviceWorkerVersion?: string
  serviceWorkerScope?: string
}

/**
 * Define a vrowser configuration.
 *
 * @param config - The vrowser configuration
 * @param baseConfig - Optional base Vite config to merge with (e.g. imported from vite.config.ts)
 * @returns The merged vrowser configuration
 */
export function defineConfig(config: VrowserConfig, baseConfig?: UserConfig): VrowserConfig {
  if (!baseConfig) {
    return config
  }
  return {
    ...baseConfig,
    ...config,
    plugins: [...(baseConfig.plugins ?? []), ...(config.plugins ?? [])]
  }
}
