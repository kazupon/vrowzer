import type { ModuleRunner } from 'vite/module-runner'
import type { WindowMessageDevServer } from './messages/dev.ts'

declare module '*.vue' {
  import { defineComponent } from 'vue'

  const component: ReturnType<typeof defineComponent>
  export default component
}

declare module '*.css' {
  const css: string
  export default css
}

/**
 * NOTE(kazupon):
 * Temporary module augmentation for Vite to include WindowMessageServer in HMR context.
 * `createDevEnvironmentContext` should more abstract for Vite dev server.
 */
declare module 'vite' {
  export interface CreateDevEnvironmentContext {
    ws: WindowMessageServer
  }

  export interface ViteDevServer {
    devWindowMessageServer: WindowMessageDevServer | null
    /**
     * @internal
     */
    _setInternalServer(server: ViteDevServer): void
    /**
     * @internal
     */
    _restartPromise: Promise<void> | null
    /**
     * @internal
     */
    _forceOptimizeOnRestart: boolean
    /**
     * @internal
     */
    // _shortcutsState?: ShortcutsState<ViteDevServer>
    /**
     * @internal
     */
    _ssrCompatModuleRunner?: ModuleRunner
  }
}

declare global {
  var __vite_start_time: number | undefined
}
