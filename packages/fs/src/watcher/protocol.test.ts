import { describe, expect, test } from 'vitest'
import { V_FS_INIT, V_FS_MKDIR, V_FS_UNLINK, V_FS_WRITE } from './protocol.ts'

describe('@vrowzer/fs/watcher protocol', () => {
  test('V_FS_WRITE constant has correct value', () => {
    expect(V_FS_WRITE).toBe('V_FS_WRITE')
  })

  test('V_FS_UNLINK constant has correct value', () => {
    expect(V_FS_UNLINK).toBe('V_FS_UNLINK')
  })

  test('V_FS_MKDIR constant has correct value', () => {
    expect(V_FS_MKDIR).toBe('V_FS_MKDIR')
  })

  test('V_FS_INIT constant has correct value', () => {
    expect(V_FS_INIT).toBe('V_FS_INIT')
  })
})
