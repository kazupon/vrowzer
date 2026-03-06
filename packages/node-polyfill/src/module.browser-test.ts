import { describe, expect, it } from 'vitest'
import { createRequire, isBuiltin } from './module.ts'

describe('createRequire', () => {
  it('should return a function', () => {
    const req = createRequire('file:///fake.js')
    expect(typeof req).toBe('function')
  })

  it('should throw when require is called', () => {
    const req = createRequire('file:///fake.js')
    expect(() => req('some-module')).toThrow(/require\(\) is not supported/)
  })

  it('should have resolve function that returns the id', () => {
    const req = createRequire('file:///fake.js')
    expect(typeof req.resolve).toBe('function')
    expect(req.resolve('some-module')).toBe('some-module')
  })

  it('should have cache object', () => {
    const req = createRequire('file:///fake.js')
    expect(typeof req.cache).toBe('object')
  })

  it('should accept URL object', () => {
    const req = createRequire(new URL('file:///fake.js'))
    expect(typeof req).toBe('function')
  })
})

describe('isBuiltin', () => {
  it('should return true for builtin modules', () => {
    expect(isBuiltin('fs')).toBe(true)
    expect(isBuiltin('path')).toBe(true)
    expect(isBuiltin('crypto')).toBe(true)
    expect(isBuiltin('events')).toBe(true)
  })

  it('should return true for node: prefixed modules', () => {
    expect(isBuiltin('node:fs')).toBe(true)
    expect(isBuiltin('node:path')).toBe(true)
    expect(isBuiltin('node:crypto')).toBe(true)
  })

  it('should return false for non-builtin modules', () => {
    expect(isBuiltin('express')).toBe(false)
    expect(isBuiltin('lodash')).toBe(false)
    expect(isBuiltin('node:nonexistent')).toBe(false)
  })
})
