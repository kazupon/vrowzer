/**
 * IDE RPC type definitions.
 *
 * Shared between server (ide.ts) and client (IdeApp.vue).
 * birpc uses these interfaces for type-safe bidirectional communication.
 */

/** Functions the server exposes to the client */
export interface ServerFunctions {
  writeFile(path: string, content: string): Promise<void>
}

/** Functions the client exposes to the server */
export interface ClientFunctions {
  onFileChanged(path: string, content: string): void
}
