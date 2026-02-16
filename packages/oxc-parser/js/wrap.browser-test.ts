import { describe, expect, it } from 'vitest'
import { jsonParseAst, wrap } from './wrap.ts'

import type { BigIntLiteral, ExpressionStatement, RegExpLiteral, WasmParseResult } from './types.ts'

describe('jsonParseAst', () => {
  it('returns program node as-is when there are no fixes', () => {
    const json = JSON.stringify({
      node: { type: 'Program', body: [], sourceType: 'module', hashbang: null },
      fixes: []
    })
    const result = jsonParseAst(json)
    expect(result.type).toBe('Program')
    expect(result.body).toEqual([])
  })

  it('restores BigInt literal value', () => {
    const json = JSON.stringify({
      node: {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: { type: 'Literal', bigint: '123', value: null, raw: '123n' }
          }
        ],
        sourceType: 'module',
        hashbang: null
      },
      fixes: [['body', 0, 'expression']]
    })
    const result = jsonParseAst(json)
    const stmt = result.body[0] as ExpressionStatement
    const literal = stmt.expression as BigIntLiteral
    expect(literal.value).toBe(BigInt(123))
  })

  it('restores RegExp literal value', () => {
    const json = JSON.stringify({
      node: {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Literal',
              regex: { pattern: 'xyz', flags: 'g' },
              value: null,
              raw: '/xyz/g'
            }
          }
        ],
        sourceType: 'module',
        hashbang: null
      },
      fixes: [['body', 0, 'expression']]
    })
    const result = jsonParseAst(json)
    const stmt = result.body[0] as ExpressionStatement
    const literal = stmt.expression as RegExpLiteral
    expect(literal.value).toBeInstanceOf(RegExp)
    expect(literal.value!.source).toBe('xyz')
    expect(literal.value!.flags).toBe('g')
  })

  it('applies multiple fixes correctly', () => {
    const json = JSON.stringify({
      node: {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: { type: 'Literal', bigint: '42', value: null, raw: '42n' }
          },
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Literal',
              regex: { pattern: 'abc', flags: 'i' },
              value: null,
              raw: '/abc/i'
            }
          }
        ],
        sourceType: 'module',
        hashbang: null
      },
      fixes: [
        ['body', 0, 'expression'],
        ['body', 1, 'expression']
      ]
    })
    const result = jsonParseAst(json)
    const bigintLiteral = (result.body[0] as ExpressionStatement).expression as BigIntLiteral
    const regexpLiteral = (result.body[1] as ExpressionStatement).expression as RegExpLiteral
    expect(bigintLiteral.value).toBe(BigInt(42))
    expect(regexpLiteral.value).toBeInstanceOf(RegExp)
    expect(regexpLiteral.value!.source).toBe('abc')
  })

  it('does not throw on invalid RegExp pattern', () => {
    const json = JSON.stringify({
      node: {
        type: 'Program',
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Literal',
              regex: { pattern: '(?<=a)b', flags: '' },
              value: null,
              raw: '/(?<=a)b/'
            }
          }
        ],
        sourceType: 'module',
        hashbang: null
      },
      fixes: [['body', 0, 'expression']]
    })
    expect(() => jsonParseAst(json)).not.toThrow()
  })
})

describe('wrap', () => {
  function createMockResult(): WasmParseResult {
    return {
      program: JSON.stringify({
        node: { type: 'Program', body: [], sourceType: 'module', hashbang: null },
        fixes: []
      }),
      module: JSON.stringify({
        hasModuleSyntax: false,
        staticImports: [],
        staticExports: [],
        dynamicImports: [],
        importMetas: []
      }),
      comments: JSON.stringify([{ type: 'Line', value: ' hello', start: 0, end: 8 }]),
      errors: JSON.stringify([])
    }
  }

  it('returns program as a JS object', () => {
    const result = wrap(createMockResult())
    expect(result.program.type).toBe('Program')
    expect(result.program.body).toEqual([])
  })

  it('returns module as a JS object', () => {
    const result = wrap(createMockResult())
    expect(result.module.hasModuleSyntax).toBe(false)
    expect(result.module.staticImports).toEqual([])
    expect(result.module.staticExports).toEqual([])
    expect(result.module.dynamicImports).toEqual([])
    expect(result.module.importMetas).toEqual([])
  })

  it('returns comments as a JS array', () => {
    const result = wrap(createMockResult())
    expect(result.comments).toHaveLength(1)
    expect(result.comments[0]!.type).toBe('Line')
    expect(result.comments[0]!.value).toBe(' hello')
    expect(result.comments[0]!.start).toBe(0)
    expect(result.comments[0]!.end).toBe(8)
  })

  it('returns errors as a JS array', () => {
    const result = wrap(createMockResult())
    expect(result.errors).toEqual([])
  })

  it('returns OxcError array when errors are present', () => {
    const mock = createMockResult()
    const withErrors: WasmParseResult = {
      ...mock,
      errors: JSON.stringify([
        {
          severity: 'Error',
          message: 'Unexpected token',
          labels: [{ message: 'here', start: 0, end: 5 }],
          helpMessage: null
        }
      ])
    }
    const result = wrap(withErrors)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]!.severity).toBe('Error')
    expect(result.errors[0]!.message).toBe('Unexpected token')
    expect(result.errors[0]!.labels[0]!.start).toBe(0)
  })

  it('lazy getter returns the same object on second access', () => {
    const result = wrap(createMockResult())
    const p1 = result.program
    const p2 = result.program
    expect(p1).toBe(p2)

    const m1 = result.module
    const m2 = result.module
    expect(m1).toBe(m2)

    const c1 = result.comments
    const c2 = result.comments
    expect(c1).toBe(c2)

    const e1 = result.errors
    const e2 = result.errors
    expect(e1).toBe(e2)
  })
})
