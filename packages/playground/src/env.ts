import { arraify } from './utils.ts'

import type { UserConfig } from 'vite'

// ---

export function resolveEnvPrefix({ envPrefix = 'VITE_' }: UserConfig): string[] {
  envPrefix = arraify(envPrefix)
  if (envPrefix.includes('')) {
    throw new Error(
      `envPrefix option contains value '', which could lead unexpected exposure of sensitive information.`
    )
  }
  return envPrefix
}
