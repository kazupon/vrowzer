/**
 * IDE app entry point.
 *
 * Loaded via `<script type="module">` in the IDE HTML.
 * Exposes `mountIde` as a global function (`window.__vrowser_ide_mount__`)
 * which is called by the client.js virtual module after importing
 * runtime dependencies (vrowser, manifest).
 */

import { createApp } from 'vue'
import IdeApp from './IdeApp.vue'

import type { App } from 'vue'

export interface IdeManifest {
  name: string
  files: Record<string, string>
  nodeModules?: Record<string, string>
  activeFile?: string
}

export interface MountIdeOptions {
  manifest: IdeManifest
  basePath: string
  Vrowser: (options?: { basePath?: string }) => any
  rpcPort: number
}

function mountIde(options: MountIdeOptions): App {
  const app = createApp(IdeApp, {
    manifest: options.manifest,
    basePath: options.basePath,
    VrowserFactory: options.Vrowser,
    rpcPort: options.rpcPort
  })
  app.mount('#app')
  return app
}

// Expose as global for client.js to call
;(window as any).__vrowser_ide_mount__ = mountIde
