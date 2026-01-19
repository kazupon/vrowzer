

// ...

export interface EnvironmentResolveOptions {
  /**
   * @default ['browser', 'module', 'jsnext:main', 'jsnext']
   */
  mainFields?: string[]
  conditions?: string[]
  externalConditions?: string[]
  /**
   * @default ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
   */
  extensions?: string[]
  dedupe?: string[]
  // TODO: better abstraction that works for the client environment too?
  /**
   * Prevent listed dependencies from being externalized and will get bundled in build.
   * Only works in server environments for now. Previously this was `ssr.noExternal`.
   * @experimental
   */
  noExternal?: string | RegExp | (string | RegExp)[] | true
  /**
   * Externalize the given dependencies and their transitive dependencies.
   * Only works in server environments for now. Previously this was `ssr.external`.
   * @experimental
   */
  external?: string[] | true
  /**
   * Array of strings or regular expressions that indicate what modules are builtin for the environment.
   */
  builtins?: (string | RegExp)[]
}

export interface ResolveOptions extends EnvironmentResolveOptions {
  /**
   * @default false
   */
  preserveSymlinks?: boolean
  /**
   * Enable tsconfig paths resolution
   *
   * This option does not have any effect if `experimental.enableNativePlugin` is set to `false`.
   *
   * @default false
   * @experimental
   */
  tsconfigPaths?: boolean
}

// ...
