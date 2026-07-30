import type { ServerOptions } from '.'
import type {
  ForwardConsoleOptions,
  ResolvedForwardConsoleOptions,
} from '../../shared/forwardConsole'
import {
  DEFAULT_DEV_PORT,
  defaultAllowedOrigins
} from '../constants'

export function resolveForwardConsoleOptions(
  value:
    | boolean
    | ForwardConsoleOptions
    | ResolvedForwardConsoleOptions
    | undefined,
): ResolvedForwardConsoleOptions {
  if (value === undefined || value === false) {
    return {
      enabled: false,
      unhandledErrors: false,
      logLevels: [],
    }
  }

  if (value === true) {
    return {
      enabled: true,
      unhandledErrors: true,
      logLevels: ['error', 'warn'],
    }
  }

  if ('enabled' in value) {
    return {
      enabled: value.enabled,
      unhandledErrors: value.unhandledErrors,
      logLevels: [...value.logLevels],
    }
  }

  const unhandledErrors = value.unhandledErrors ?? true
  const logLevels = value.logLevels ?? []

  return {
    enabled: unhandledErrors || logLevels.length > 0,
    unhandledErrors,
    logLevels,
  }
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
    ssrFiles: [],
  },
  // watch
  middlewareMode: false,
  fs: {
    strict: true,
    // allow
    deny: [
      '.env',
      '.env.*',
      '*.{crt,pem,key,p12,pfx,cer,der}',
      '.npmrc',
      '.yarnrc.yml',
      '**/.git/**',
    ],
  },
  // origin
  preTransformRequests: true,
  // sourcemapIgnoreList
  perEnvironmentStartEndDuringDev: false,
  perEnvironmentWatchChangeDuringDev: false,
  // hotUpdateEnvironments
  forwardConsole: undefined,
} satisfies ServerOptions)

export const serverConfigDefaults = _serverConfigDefaults
