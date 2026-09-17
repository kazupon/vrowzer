import { describe, expect, test } from 'vite-plus/test'
import type { ResolvedConfig } from './config'
import {
  assertBundledDevEnvironmentUnsupported,
  assertBundledDevUnsupported,
  isBundledDevEnvironment,
} from './bundled-dev-guard'

function createConfig(
  bundledDev: boolean,
  environments: Record<string, { isBundled: boolean }> = {
    client: { isBundled: false },
    ssr: { isBundled: false },
  },
) {
  return {
    experimental: { bundledDev },
    environments,
  } as unknown as ResolvedConfig
}

describe('isBundledDevEnvironment', () => {
  test.each([
    { name: 'client', isBundled: false, bundledDev: false, expected: false },
    { name: 'client', isBundled: true, bundledDev: false, expected: true },
    // Vite creates BundledDev for the client even if isBundled resolves to false.
    { name: 'client', isBundled: false, bundledDev: true, expected: true },
    { name: 'ssr', isBundled: false, bundledDev: false, expected: false },
    { name: 'ssr', isBundled: true, bundledDev: false, expected: true },
    { name: 'ssr', isBundled: false, bundledDev: true, expected: false },
  ])(
    '$name with isBundled=$isBundled and bundledDev=$bundledDev',
    ({ name, isBundled, bundledDev, expected }) => {
      expect(isBundledDevEnvironment(name, { isBundled }, createConfig(bundledDev))).toBe(expected)
    },
  )
})

describe('assertBundledDevEnvironmentUnsupported', () => {
  test('throws with the environment name', () => {
    expect(() =>
      assertBundledDevEnvironmentUnsupported('ssr', { isBundled: true }, createConfig(false)),
    ).toThrow(
      '[vrowzer] Bundled dev mode is not supported: environment "ssr" is bundled during serve. '
      + 'Remove experimental.bundledDev and environments.ssr.isBundled from the Worker config.',
    )
  })

  test('does not throw for an unbundled environment', () => {
    expect(() =>
      assertBundledDevEnvironmentUnsupported('client', { isBundled: false }, createConfig(false)),
    ).not.toThrow()
  })
})

describe('assertBundledDevUnsupported', () => {
  test('does not throw for the default serve environments', () => {
    expect(() => assertBundledDevUnsupported(createConfig(false))).not.toThrow()
  })

  test('throws when bundledDev seeds the client environment', () => {
    expect(() => assertBundledDevUnsupported(createConfig(true))).toThrow(
      'environment "client" is bundled during serve',
    )
  })

  test('throws when a non-client environment is bundled', () => {
    expect(() =>
      assertBundledDevUnsupported(
        createConfig(false, { client: { isBundled: false }, ssr: { isBundled: true } }),
      ),
    ).toThrow('environment "ssr" is bundled during serve')
  })
})
