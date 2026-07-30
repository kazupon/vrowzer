import { describe, expect, test } from 'vite-plus/test'
import { resolveForwardConsoleOptions } from './options'

describe('resolveForwardConsoleOptions', () => {
  test('disables forwarding by default in a Worker', () => {
    expect(resolveForwardConsoleOptions(undefined)).toEqual({
      enabled: false,
      unhandledErrors: false,
      logLevels: [],
    })
  })

  test('resolves boolean options', () => {
    expect(resolveForwardConsoleOptions(false)).toEqual({
      enabled: false,
      unhandledErrors: false,
      logLevels: [],
    })
    expect(resolveForwardConsoleOptions(true)).toEqual({
      enabled: true,
      unhandledErrors: true,
      logLevels: ['error', 'warn'],
    })
  })

  test('resolves custom options', () => {
    expect(
      resolveForwardConsoleOptions({
        unhandledErrors: false,
        logLevels: ['log'],
      }),
    ).toEqual({
      enabled: true,
      unhandledErrors: false,
      logLevels: ['log'],
    })
    expect(
      resolveForwardConsoleOptions({
        unhandledErrors: false,
        logLevels: [],
      }),
    ).toEqual({
      enabled: false,
      unhandledErrors: false,
      logLevels: [],
    })
  })

  test('preserves host-resolved options', () => {
    expect(
      resolveForwardConsoleOptions({
        enabled: true,
        unhandledErrors: false,
        logLevels: ['debug'],
      }),
    ).toEqual({
      enabled: true,
      unhandledErrors: false,
      logLevels: ['debug'],
    })
  })
})
