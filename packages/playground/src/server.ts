import path from 'pathe'
import colors from 'picocolors'
import { DEFAULT_DEV_PORT, defaultAllowedOrigins } from './constants.ts'
import { isInNodeModules, mergeWithDefaults, normalizePath } from './utils.ts'

import type { ResolvedServerOptions, ServerOptions } from 'vite'
import type { Logger } from './logger.ts'

function resolvedAllowDir(root: string, dir: string): string {
  return normalizePath(path.resolve(root, dir))
}

const _serverConfigDefaults = Object.freeze({
  port: DEFAULT_DEV_PORT,
  strictPort: false,
  host: 'localhost',
  allowedHosts: [],
  https: undefined,
  open: false,
  proxy: undefined,
  cors: { origin: defaultAllowedOrigins },
  headers: {},
  // hmr
  // ws
  warmup: {
    clientFiles: [],
    ssrFiles: []
  },
  // watch
  middlewareMode: false,
  fs: {
    strict: true,
    // allow
    deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**']
  },
  // origin
  preTransformRequests: true,
  // sourcemapIgnoreList
  perEnvironmentStartEndDuringDev: false,
  perEnvironmentWatchChangeDuringDev: false
  // hotUpdateEnvironments
} satisfies ServerOptions)
export const serverConfigDefaults: Readonly<Partial<ServerOptions>> = _serverConfigDefaults

export function resolveServerOptions(
  root: string,
  raw: ServerOptions | undefined,
  logger: Logger
): ResolvedServerOptions {
  const _server = mergeWithDefaults(
    {
      ..._serverConfigDefaults,
      host: undefined, // do not set here to detect whether host is set or not
      sourcemapIgnoreList: isInNodeModules
    },
    raw ?? {}
  )

  const server: ResolvedServerOptions = {
    ..._server,
    fs: {
      ..._server.fs,
      // run searchForWorkspaceRoot only if needed
      // NOTE(kazupon): disable searchForWorkspaceRoot for the browser
      // allow: raw?.fs?.allow ?? [searchForWorkspaceRoot(root)],
      allow: []
    },
    sourcemapIgnoreList:
      _server.sourcemapIgnoreList === false ? () => false : _server.sourcemapIgnoreList
  }

  let allowDirs = server.fs.allow

  // NOTE(kazupon): disable pnp for the browser
  // if (process.versions.pnp) {
  //   // running a command fails if cwd doesn't exist and root may not exist
  //   // search for package root to find a path that exists
  //   const cwd = searchForPackageRoot(root)
  //   try {
  //     const enableGlobalCache =
  //       execSync('yarn config get enableGlobalCache', { cwd })
  //         .toString()
  //         .trim() === 'true'
  //     const yarnCacheDir = execSync(
  //       `yarn config get ${enableGlobalCache ? 'globalFolder' : 'cacheFolder'}`,
  //       { cwd },
  //     )
  //       .toString()
  //       .trim()
  //     allowDirs.push(yarnCacheDir)
  //   } catch (e) {
  //     logger.warn(`Get yarn cache dir error: ${e.message}`, {
  //       timestamp: true,
  //     })
  //   }
  // }

  allowDirs = allowDirs.map(i => resolvedAllowDir(root, i))

  // only push client dir when vite itself is outside-of-root
  // NOTE(kazupon): disable CLIENT_DIR for the browser
  // const resolvedClientDir = resolvedAllowDir(root, CLIENT_DIR)
  // if (!allowDirs.some((dir) => isParentDirectory(dir, resolvedClientDir))) {
  //   allowDirs.push(resolvedClientDir)
  // }

  server.fs.allow = allowDirs

  if (server.origin?.endsWith('/')) {
    server.origin = server.origin.slice(0, -1)
    logger.warn(
      colors.yellow(
        `${colors.bold('(!)')} server.origin should not end with "/". Using "${
          server.origin
        }" instead.`
      )
    )
  }

  if (
    // process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS &&
    // NOTE(kazupon): disable env var for the browser
    import.meta.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS &&
    Array.isArray(server.allowedHosts)
  ) {
    // const additionalHost = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
    // NOTE(kazupon): disable env var for the browser
    const additionalHost = import.meta.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
    server.allowedHosts = [...server.allowedHosts, additionalHost]
  }

  return server
}

// ---
