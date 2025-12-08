import type { WindowMessageServer } from './message.ts'

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
}
