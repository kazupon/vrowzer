import type { ServerOptions } from '.'
import {
  DEFAULT_DEV_PORT,
  defaultAllowedOrigins
} from '../constants'

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
} satisfies ServerOptions)

export const serverConfigDefaults = _serverConfigDefaults
