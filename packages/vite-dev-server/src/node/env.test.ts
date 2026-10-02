import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vite-plus/test'
import type { UserConfig } from './config'
import { loadEnv, resolveEnvPrefix } from './env'

// Ported from upstream Vite (`packages/vite/src/node/__tests__/env.spec.ts`, and the tests of
// `resolveEnvPrefix()` in `config.spec.ts`).
// NOTE(kazupon): the fixtures are in `__tests__`, as upstream has them next to its spec
const dirname = fileURLToPath(new URL('./__tests__', import.meta.url))

describe('loadEnv', () => {
  test('basic', () => {
    expect(loadEnv('development', join(dirname, './env')))
      .toMatchInlineSnapshot(`
        {
          "VITE_APP_BASE_ROUTE": "/",
          "VITE_APP_BASE_URL": "/",
          "VITE_ENV1": "ENV1",
          "VITE_ENV2": "ENV2",
          "VITE_ENV3": "ENV3",
        }
      `)
  })

  test('specific prefix', () => {
    expect(loadEnv('development', join(dirname, './env'), 'VVITE'))
      .toMatchInlineSnapshot(`
        {
          "VVITE_A": "A",
          "VVITE_B": "B",
        }
      `)
  })

  test('override', () => {
    expect(loadEnv('production', join(dirname, './env')))
      .toMatchInlineSnapshot(`
        {
          "VITE_APP_BASE_ROUTE": "/app/",
          "VITE_APP_BASE_URL": "/app/",
        }
      `)
  })

  test('override 2', () => {
    expect(loadEnv('development2', join(dirname, './env')))
      .toMatchInlineSnapshot(`
        {
          "VITE_APP_BASE_ROUTE": "source",
          "VITE_APP_BASE_URL": "source",
          "VITE_SOURCE": "source",
        }
      `)
  })

  test('VITE_USER_NODE_ENV', () => {
    loadEnv('development', join(dirname, './env'))
    expect(process.env.VITE_USER_NODE_ENV).toEqual(undefined)
  })

  test('VITE_USER_NODE_ENV for dev behaviour in build', () => {
    const _nodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    loadEnv('testing', join(dirname, './env'))
    expect(process.env.VITE_USER_NODE_ENV).toEqual('development')
    process.env.NODE_ENV = _nodeEnv
  })

  test('Already exists VITE_USER_NODE_ENV', () => {
    process.env.VITE_USER_NODE_ENV = 'test'
    loadEnv('development', join(dirname, './env'))
    expect(process.env.VITE_USER_NODE_ENV).toEqual('test')
  })

  test('prioritize existing process.env', () => {
    process.env.VITE_ENV_TEST_ENV = 'EXIST'
    expect(loadEnv('existing', join(dirname, './env'))).toMatchInlineSnapshot(`
        {
          "VITE_APP_BASE_ROUTE": "/",
          "VITE_APP_BASE_URL": "/",
          "VITE_ENV_TEST_ENV": "EXIST",
          "VITE_USER_NODE_ENV": "test",
        }
      `)
  })
})

describe('resolveEnvPrefix', () => {
  test(`use 'VITE_' as default value`, () => {
    const config: UserConfig = {}
    expect(resolveEnvPrefix(config)).toMatchObject(['VITE_'])
  })

  test(`throw error if envPrefix contains ''`, () => {
    let config: UserConfig = { envPrefix: '' }
    expect(() => resolveEnvPrefix(config)).toThrow()
    config = { envPrefix: ['', 'CUSTOM_'] }
    expect(() => resolveEnvPrefix(config)).toThrow()
  })

  test(`show a warning message if envPrefix contains a whitespace`, () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    let config: UserConfig = { envPrefix: 'WITH SPACE' }
    resolveEnvPrefix(config)
    expect(consoleWarnSpy).toHaveBeenCalled()
    config = { envPrefix: ['CUSTOM_', 'ANOTHER SPACE'] }
    resolveEnvPrefix(config)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
    consoleWarnSpy.mockRestore()
  })

  test('should work correctly for valid envPrefix value', () => {
    const config: UserConfig = { envPrefix: ['CUSTOM_'] }
    expect(resolveEnvPrefix(config)).toMatchObject(['CUSTOM_'])
  })
})
