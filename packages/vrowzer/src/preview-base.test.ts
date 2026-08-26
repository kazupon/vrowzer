import { describe, expect, test } from 'vite-plus/test'
import {
  DEFAULT_PREVIEW_BASE_PATH,
  normalizePreviewBasePath,
  resolvePreviewBasePath
} from './preview-base.ts'

describe('normalizePreviewBasePath', () => {
  test.each([
    ['/__preview__', '/__preview__/'],
    ['/__preview__///', '/__preview__/'],
    ['/app/__preview__', '/app/__preview__/'],
    ['/app/__preview__/', '/app/__preview__/']
  ])('normalizes %s to %s', (basePath, expected) => {
    expect(normalizePreviewBasePath(basePath)).toBe(expected)
  })

  test.each(['', '/', 'preview/', '//example.com/preview/', '/preview/?mode=dev', '/preview/#x'])(
    'rejects invalid basePath %j',
    basePath => {
      expect(() => normalizePreviewBasePath(basePath)).toThrow(TypeError)
    }
  )
})

describe('resolvePreviewBasePath', () => {
  test('falls back to the default without runtime or injected values', () => {
    expect(resolvePreviewBasePath()).toBe(DEFAULT_PREVIEW_BASE_PATH)
  })

  test('uses the runtime value without an injected value', () => {
    expect(resolvePreviewBasePath('/runtime', undefined)).toBe('/runtime/')
  })

  test('uses the injected value without a runtime value', () => {
    expect(resolvePreviewBasePath(undefined, '/injected')).toBe('/injected/')
  })

  test('accepts equal canonical runtime and injected values', () => {
    expect(resolvePreviewBasePath('/app/__preview__', '/app/__preview__/')).toBe(
      '/app/__preview__/'
    )
  })

  test('rejects different runtime and injected values', () => {
    expect(() => resolvePreviewBasePath('/runtime/', '/injected/')).toThrow(
      'Configure basePath in vite.config.ts'
    )
  })
})
