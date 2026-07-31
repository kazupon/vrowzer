import { describe, expect, test, vi } from 'vite-plus/test'

vi.mock('@vrowzer/rolldown', () => ({
  rolldown: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/experimental', () => ({
  viteTransformPlugin: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('@vrowzer/rolldown/utils', () => ({
  transformSync: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('..', () => ({
  perEnvironmentPlugin: vi.fn<(...args: unknown[]) => unknown>(),
}))

import { createLogger } from '../logger'
import { convertEsbuildConfigToOxcConfig } from './oxc'

describe('convertEsbuildConfigToOxcConfig', () => {
  const logger = createLogger('silent')

  test('inverts jsxSideEffects when mapping to jsx.pure', () => {
    expect(
      convertEsbuildConfigToOxcConfig({ jsxSideEffects: true }, logger).jsx,
    ).toMatchObject({ pure: false })
    expect(
      convertEsbuildConfigToOxcConfig({ jsxSideEffects: false }, logger).jsx,
    ).toMatchObject({ pure: true })
  })
})
