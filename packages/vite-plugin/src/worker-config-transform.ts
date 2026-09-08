/**
 * Inline supported host file reads without executing the Worker config.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import MagicString from 'magic-string'
import { Visitor } from 'rolldown/utils'
import { parseConfigModule } from './worker-config.ts'

import type {
  BindingPattern,
  BindingRestElement,
  Expression,
  MemberExpression
} from '@oxc-project/types'

export const DEFINE_CONFIG_ID = '\0vrowzer:define-config'

interface TransformConfigOptions {
  filename: string
  sourceDirectory: string
  local: boolean
  strict: boolean
  addDependency: (filename: string) => void
}

function importMetaKey(node: MemberExpression): string | undefined {
  if (
    !node.computed &&
    node.object.type === 'MetaProperty' &&
    node.object.meta.name === 'import' &&
    node.object.property.name === 'meta' &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name
  }
}

export function transformConfigModule(source: string, options: TransformConfigOptions) {
  const { filename, sourceDirectory, local, strict, addDependency } = options
  if (
    !source.includes('createRequire') &&
    !(local && /defineConfig|readFileSync|import\.meta\./.test(source))
  ) {
    return
  }

  const program = parseConfigModule(source, filename)
  const readers = new Set<string>()
  const resolvers = new Set<string>()
  const requireFactories = new Set<string>()
  const moduleBindings = new Set<string>()
  const code = new MagicString(source)
  function collectBindings(pattern: BindingPattern | BindingRestElement) {
    switch (pattern.type) {
      case 'Identifier':
        moduleBindings.add(pattern.name)
        break
      case 'AssignmentPattern':
        collectBindings(pattern.left)
        break
      case 'RestElement':
        collectBindings(pattern.argument)
        break
      case 'ObjectPattern':
        for (const property of pattern.properties) {
          collectBindings(property.type === 'RestElement' ? property.argument : property.value)
        }
        break
      case 'ArrayPattern':
        for (const element of pattern.elements) {
          if (element) {
            collectBindings(element)
          }
        }
        break
    }
  }
  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type === 'VariableDeclaration') {
      for (const variable of declaration.declarations) {
        collectBindings(variable.id)
      }
    } else if (
      (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') &&
      declaration.id
    ) {
      moduleBindings.add(declaration.id.name)
    }
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') {
      continue
    }
    if (local && statement.source.value === 'vite') {
      const helpers = statement.specifiers.filter(
        specifier =>
          specifier.type === 'ImportSpecifier' &&
          specifier.importKind !== 'type' &&
          (specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : specifier.imported.value) === 'defineConfig'
      )
      if (helpers.length > 0) {
        // Keep the identity helper out of the Vite runtime barrel's shared chunks.
        const remaining = statement.specifiers.filter(specifier => !helpers.includes(specifier))
        const named = remaining.filter(specifier => specifier.type === 'ImportSpecifier')
        const clause = remaining
          .filter(specifier => specifier.type !== 'ImportSpecifier')
          .map(specifier => source.slice(specifier.start, specifier.end))
        if (named.length) {
          clause.push(
            `{ ${named.map(specifier => source.slice(specifier.start, specifier.end)).join(', ')} }`
          )
        }
        const original = clause.length
          ? `import ${clause.join(', ')} from ${JSON.stringify(statement.source.value)}${source.slice(statement.source.end, statement.end)}\n`
          : ''
        code.overwrite(
          statement.start,
          statement.end,
          `${original}import { ${helpers.map(specifier => `defineConfig as ${specifier.local.name}`).join(', ')} } from ${JSON.stringify(DEFINE_CONFIG_ID)};`
        )
      }
    }
    for (const specifier of statement.specifiers) {
      moduleBindings.add(specifier.local.name)
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') {
        continue
      }
      const imported =
        specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : specifier.imported.value
      const from = statement.source.value.replace(/^node:/, '')
      if (from === 'fs' && imported === 'readFileSync') {
        readers.add(specifier.local.name)
      }
      if (from === 'path' && imported === 'resolve') {
        resolvers.add(specifier.local.name)
      }
      if (from === 'module' && imported === 'createRequire') {
        requireFactories.add(specifier.local.name)
      }
    }
  }

  function pathValue(node: Expression): string | undefined {
    if (node.type === 'Literal' && typeof node.value === 'string') {
      return node.value
    }
    if (
      node.type === 'Identifier' &&
      node.name === '__dirname' &&
      !moduleBindings.has('__dirname')
    ) {
      return sourceDirectory
    }
    if (node.type === 'MemberExpression') {
      switch (importMetaKey(node)) {
        case 'dirname':
          return sourceDirectory
        case 'filename':
          return filename
        case 'url':
          return pathToFileURL(filename).href
      }
    }
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      resolvers.has(node.callee.name) &&
      !node.optional
    ) {
      const values = node.arguments.map(argument =>
        argument.type === 'SpreadElement' ? undefined : pathValue(argument)
      )
      if (values.length && values.every(value => value !== undefined)) {
        return resolve(sourceDirectory, ...values)
      }
    }
    if (
      node.type === 'NewExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'URL' &&
      !moduleBindings.has('URL') &&
      node.arguments.length === 2
    ) {
      const [relative, base] = node.arguments
      if (
        relative?.type !== 'SpreadElement' &&
        base?.type !== 'SpreadElement' &&
        relative &&
        base
      ) {
        const relativeValue = pathValue(relative)
        const baseValue = pathValue(base)
        if (relativeValue !== undefined && baseValue?.startsWith('file:')) {
          return fileURLToPath(new URL(relativeValue, baseValue))
        }
      }
    }
  }

  const replaced: Array<{ start: number; end: number }> = []
  const isReplaced = (start: number) =>
    replaced.some(range => start >= range.start && start < range.end)
  let nested = 0
  const enter = () => {
    nested++
  }
  const leave = () => {
    nested--
  }

  new Visitor({
    FunctionDeclaration: enter,
    'FunctionDeclaration:exit': leave,
    FunctionExpression: enter,
    'FunctionExpression:exit': leave,
    ArrowFunctionExpression: enter,
    'ArrowFunctionExpression:exit': leave,
    BlockStatement: enter,
    'BlockStatement:exit': leave,
    ForStatement: enter,
    'ForStatement:exit': leave,
    ForInStatement: enter,
    'ForInStatement:exit': leave,
    ForOfStatement: enter,
    'ForOfStatement:exit': leave,
    ClassBody: enter,
    'ClassBody:exit': leave,
    CallExpression(node) {
      if (nested > 0 || node.optional || isReplaced(node.start)) {
        return
      }
      const [argument, encoding] = node.arguments
      if (
        local &&
        node.callee.type === 'Identifier' &&
        readers.has(node.callee.name) &&
        argument &&
        argument.type !== 'SpreadElement' &&
        encoding?.type === 'Literal' &&
        (encoding.value === 'utf-8' || encoding.value === 'utf8') &&
        node.arguments.length === 2
      ) {
        const value = pathValue(argument)
        if (value === undefined) {
          return
        }
        const path = resolve(sourceDirectory, value)
        addDependency(path)
        try {
          code.overwrite(node.start, node.end, JSON.stringify(readFileSync(path, 'utf-8')))
          replaced.push(node)
        } catch (cause) {
          if (strict) {
            throw new Error(`[vrowzer] Cannot read workerConfig dependency ${path}`, { cause })
          }
        }
      } else if (
        node.callee.type === 'CallExpression' &&
        node.callee.callee.type === 'Identifier' &&
        requireFactories.has(node.callee.callee.name) &&
        !node.callee.optional &&
        node.callee.arguments.length === 1 &&
        argument?.type === 'Literal' &&
        typeof argument.value === 'string' &&
        argument.value.endsWith('.json') &&
        node.arguments.length === 1
      ) {
        const anchorArgument = node.callee.arguments[0]
        const anchor =
          anchorArgument && anchorArgument.type !== 'SpreadElement'
            ? pathValue(anchorArgument)
            : undefined
        if (anchor === undefined || (!isAbsolute(anchor) && !anchor.startsWith('file:'))) {
          return
        }
        try {
          const requestedPath =
            local && (argument.value.startsWith('.') || isAbsolute(argument.value))
              ? resolve(
                  dirname(anchor.startsWith('file:') ? fileURLToPath(anchor) : anchor),
                  argument.value
                )
              : undefined
          if (requestedPath) {
            addDependency(requestedPath)
          }
          const path = createRequire(anchor).resolve(argument.value)
          if (path !== requestedPath) {
            addDependency(path)
          }
          code.overwrite(
            node.start,
            node.end,
            JSON.stringify(JSON.parse(readFileSync(path, 'utf-8')))
          )
          replaced.push(node)
        } catch (cause) {
          if (strict && local) {
            throw new Error(`[vrowzer] Cannot inline ${argument.value} from ${filename}`, { cause })
          }
        }
      }
    },
    MemberExpression(node) {
      if (!local || isReplaced(node.start)) {
        return
      }
      const key = importMetaKey(node)
      if (key === 'dirname' || key === 'filename' || key === 'url') {
        code.overwrite(node.start, node.end, JSON.stringify(pathValue(node)))
      }
    }
  }).visit(program)

  if (code.hasChanged()) {
    return {
      code: code.toString(),
      map: code.generateMap({ source: filename, includeContent: true, hires: true })
    }
  }
}
