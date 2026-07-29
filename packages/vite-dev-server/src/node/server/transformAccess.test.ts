import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { ResolvedConfig } from '../config'

type CheckLoadingAccess = (
  config: ResolvedConfig,
  path: string,
) => 'allowed' | 'denied' | 'fallback'

const checkLoadingAccess = vi.hoisted(() => vi.fn<CheckLoadingAccess>())

vi.mock('./middlewares/static', () => ({
  checkLoadingAccess,
}))

import { isServerAccessDeniedForTransform } from './transformAccess'

const config = {} as ResolvedConfig

describe('isServerAccessDeniedForTransform', () => {
  beforeEach(() => {
    checkLoadingAccess.mockReset()
  })

  it.each(['?raw', '?url', '?inline'])(
    'checks the clean path before the original path for %s requests',
    (query) => {
      checkLoadingAccess
        .mockReturnValueOnce('allowed')
        .mockReturnValueOnce('denied')

      expect(
        isServerAccessDeniedForTransform(config, `/project/.env${query}`),
      ).toBe(true)
      expect(checkLoadingAccess).toHaveBeenNthCalledWith(
        1,
        config,
        '/project/.env',
      )
      expect(checkLoadingAccess).toHaveBeenNthCalledWith(
        2,
        config,
        `/project/.env${query}`,
      )
    },
  )

  it('stops after the clean path is denied', () => {
    checkLoadingAccess.mockReturnValueOnce('denied')

    expect(
      isServerAccessDeniedForTransform(config, '/project/secret.svg?import'),
    ).toBe(true)
    expect(checkLoadingAccess).toHaveBeenCalledOnce()
    expect(checkLoadingAccess).toHaveBeenCalledWith(
      config,
      '/project/secret.svg',
    )
  })

  it('allows a transform when both paths are allowed', () => {
    checkLoadingAccess.mockReturnValue('allowed')

    expect(
      isServerAccessDeniedForTransform(config, '/project/file.txt?raw'),
    ).toBe(false)
    expect(checkLoadingAccess).toHaveBeenCalledTimes(2)
  })

  it('does not run an fs check for regular module ids', () => {
    expect(
      isServerAccessDeniedForTransform(config, '/project/main.ts'),
    ).toBe(false)
    expect(checkLoadingAccess).not.toHaveBeenCalled()
  })
})
