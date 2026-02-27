/**
 * Vite plugin for previewing files in the browser
 *
 * @module vite-plugin
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Plugin } from 'vite'

export interface VrowserVitePluginOptions {
  /**
   * The base path for the preview system location, which is used to serve the preview files via service worker of Vrowser.
   *
   * @default '/__preview__/'
   */
  basePath?: string
  /**
   * The scope for the service worker of Vrowser, which determines the range of URLs that the service worker will control.
   *
   * @default '/' (the entire origin)
   */
  serviceWorkerScope?: string
  /**
   * The version of the service worker for Vrowser, which can be used to manage updates and cache invalidation for the preview system.
   *
   * @default 'SEVICE_WORKER_VERSION'
   */
  serviceWorkerVersion?: string
  // TODO(kazupon): add some options, if we need
  // ...
}

export function VrowserPlugin(options: VrowserVitePluginOptions = {}): Plugin {
  const resolvedOptions = resolveOptions(options)

  // TODO(kazupon): implement the plugin here
  // ...

  return {
    name: 'vite-plugin-vrowser'

    // TODO(kazupon): implement the plugin hooks here
    // ...
  }
}

function resolveOptions(options: VrowserVitePluginOptions): Required<VrowserVitePluginOptions> {
  // TODO: resolve options with default values here

  return {} as Required<VrowserVitePluginOptions>
}
