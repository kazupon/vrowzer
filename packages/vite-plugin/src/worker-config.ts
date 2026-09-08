/**
 * Host-side validation for the dedicated Web Worker config entry.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { parseSync } from 'rolldown/utils'

import type { Expression, Program } from '@oxc-project/types'

export function parseConfigModule(source: string, filename: string): Program {
  const result = parseSync(filename, source)
  if (result.errors.length > 0) {
    throw new Error(`[vrowzer] Invalid workerConfig ${filename}: ${result.errors[0]!.message}`)
  }
  return result.program
}

export function validateWorkerConfigSource(source: string, filename: string): void {
  const program = parseConfigModule(source, filename)
  const helpers = new Set<string>()
  const constants = new Map<string, Expression>()
  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration' && statement.source.value === 'vite') {
      if (statement.importKind === 'type') {
        continue
      }
      for (const specifier of statement.specifiers) {
        if (
          specifier.type === 'ImportSpecifier' &&
          specifier.importKind !== 'type' &&
          (specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : specifier.imported.value) === 'defineConfig'
        ) {
          helpers.add(specifier.local.name)
        }
      }
    }
    const declaration =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
      for (const variable of declaration.declarations) {
        if (variable.id.type === 'Identifier' && variable.init) {
          constants.set(variable.id.name, variable.init)
        }
      }
    }
  }

  function isConfigObject(expression: Expression, seen = new Set<string>()): boolean {
    switch (expression.type) {
      case 'ObjectExpression':
        return true
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSTypeAssertion':
      case 'TSNonNullExpression':
        return isConfigObject(expression.expression, seen)
      case 'Identifier': {
        const value = constants.get(expression.name)
        if (!value || seen.has(expression.name)) {
          return false
        }
        seen.add(expression.name)
        return isConfigObject(value, seen)
      }
      case 'CallExpression': {
        const argument = expression.arguments[0]
        return (
          expression.callee.type === 'Identifier' &&
          helpers.has(expression.callee.name) &&
          !expression.optional &&
          expression.arguments.length === 1 &&
          argument?.type !== 'SpreadElement' &&
          argument !== undefined &&
          isConfigObject(argument, seen)
        )
      }
      default:
        return false
    }
  }

  const exported = program.body.find(statement => statement.type === 'ExportDefaultDeclaration')
  if (!exported || !isConfigObject(exported.declaration as Expression)) {
    throw new Error(
      `[vrowzer] Invalid workerConfig ${filename}: export a config object, a local const object, ` +
        'or defineConfig(object) imported from "vite". Callbacks, promises, factories and re-exports are not supported.'
    )
  }
}

export function validateWorkerConfigFile(filename: string): void {
  let isFile = false
  try {
    isFile = statSync(filename).isFile()
  } catch {
    // Report the option and resolved path rather than silently using host extraction.
  }
  if (!isFile) {
    throw new Error(`[vrowzer] workerConfig is not a readable file: ${filename}`)
  }
  if (!['.ts', '.mts', '.js', '.mjs'].includes(extname(filename))) {
    throw new Error(
      `[vrowzer] workerConfig must be an ESM .ts, .mts, .js or .mjs file: ${filename}`
    )
  }
  validateWorkerConfigSource(readFileSync(filename, 'utf-8'), filename)
}
