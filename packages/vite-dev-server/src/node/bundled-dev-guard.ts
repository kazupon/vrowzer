/**
 * Reject Vite's bundled dev mode, which Vrowzer does not support yet.
 *
 * Vite creates `BundledDev` in `DevEnvironment` for the same condition.
 * Vrowzer has no bundler for the dev server, so a bundled environment would
 * silently drop the unbundled dev plugins and serve an empty preview.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { ResolvedConfig, ResolvedEnvironmentOptions } from './config'

/** @internal */
export function isBundledDevEnvironment(
  name: string,
  options: Pick<ResolvedEnvironmentOptions, 'isBundled'>,
  config: Pick<ResolvedConfig, 'experimental'>,
): boolean {
  return options.isBundled || (name === 'client' && config.experimental.bundledDev)
}

/** @internal */
export function assertBundledDevEnvironmentUnsupported(
  name: string,
  options: Pick<ResolvedEnvironmentOptions, 'isBundled'>,
  config: Pick<ResolvedConfig, 'experimental'>,
): void {
  if (isBundledDevEnvironment(name, options, config)) {
    throw new Error(
      `[vrowzer] Bundled dev mode is not supported: environment "${name}" is bundled during serve. `
      + `Remove experimental.bundledDev and environments.${name}.isBundled from the Worker config.`,
    )
  }
}

/** @internal For the Service Worker, which does not create `DevEnvironment`. */
export function assertBundledDevUnsupported(
  config: Pick<ResolvedConfig, 'experimental' | 'environments'>,
): void {
  for (const [name, options] of Object.entries(config.environments)) {
    assertBundledDevEnvironmentUnsupported(name, options, config)
  }
}
