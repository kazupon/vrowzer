import { describe, expect, test } from 'vitest'
import { Vrowser } from './index.ts'

describe('Vrowser factory', () => {
  test('returns frozen object', () => {
    const vrowser = Vrowser()
    expect(Object.isFrozen(vrowser)).toBe(true)
  })

  test('returns object with all Vrowser interface methods', () => {
    const vrowser = Vrowser()
    expect(vrowser.ready).toBeTypeOf('function')
    expect(vrowser.mount).toBeTypeOf('function')
    expect(vrowser.reloadPreview).toBeTypeOf('function')
    expect(vrowser.addFile).toBeTypeOf('function')
    expect(vrowser.updateFile).toBeTypeOf('function')
    expect(vrowser.deleteFile).toBeTypeOf('function')
  })
})
