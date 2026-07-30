import { describe, expect, test } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'
import { CLIENT_ENTRY } from '../constants'
import { clientInjectionsPlugin } from './clientInjections'

describe('clientInjectionsPlugin', () => {
  test('reads connection options from server.ws and overlay from server.hmr', async () => {
    const config = {
      mode: 'development',
      base: '/',
      configFile: '/vite.config.ts',
      server: {
        host: 'vite.example.com',
        port: 5173,
        middlewareMode: false,
        ws: {
          protocol: 'wss',
          host: 'ws.example.com',
          port: 4174,
          clientPort: 4444,
          path: '/hmr',
          timeout: 12_345,
        },
        hmr: {
          protocol: 'legacy',
          host: 'legacy.example.com',
          port: 9999,
          timeout: 54_321,
          overlay: false,
        },
        forwardConsole: {
          enabled: true,
          unhandledErrors: false,
          logLevels: ['error', 'log'],
        },
      },
      webSocketToken: 'test-token',
      experimental: {
        bundledDev: false,
      },
    } as ResolvedConfig
    const plugin = clientInjectionsPlugin(config)
    const environment = {
      config: {
        consumer: 'client',
        define: {},
      },
    }

    await (plugin.buildStart as () => Promise<void>)()
    const result = await (plugin.transform as Function).call(
      { environment },
      [
        'const protocol = __HMR_PROTOCOL__',
        'const hostname = __HMR_HOSTNAME__',
        'const port = __HMR_PORT__',
        'const directTarget = __HMR_DIRECT_TARGET__',
        'const hmrBase = __HMR_BASE__',
        'const timeout = __HMR_TIMEOUT__',
        'const overlay = __HMR_ENABLE_OVERLAY__',
        'const forwardConsole = __SERVER_FORWARD_CONSOLE__',
      ].join('\n'),
      CLIENT_ENTRY,
    )

    expect(result).toContain('const protocol = "wss"')
    expect(result).toContain('const hostname = "ws.example.com"')
    expect(result).toContain('const port = 4444')
    expect(result).toContain('const directTarget = "ws.example.com:4174/"')
    expect(result).toContain('const hmrBase = "/hmr"')
    expect(result).toContain('const timeout = 12345')
    expect(result).toContain('const overlay = false')
    expect(result).toContain(
      'const forwardConsole = {"enabled":true,"unhandledErrors":false,"logLevels":["error","log"]}',
    )
    expect(result).not.toContain('legacy.example.com')
    expect(result).not.toContain('54321')
  })
})
