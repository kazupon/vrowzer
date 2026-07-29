/**
 * Static analysis of vite.config.ts for Worker plugin extraction.
 *
 * Parses the user's vite.config.ts with OXC (via rolldown/experimental),
 * removes Vrowzer() calls and their imports,
 * and generates a Worker-compatible config source.
 *
 * @module extract
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { parseSync } from 'rolldown/experimental'
import { createDebug } from 'obug'

import type {
  ArrayExpression,
  CallExpression,
  ExportDefaultDeclaration,
  Expression,
  ImportDeclaration,
  ObjectExpression,
  ObjectProperty,
  Program
} from '@oxc-project/types'

const debug = createDebug('vite-plugin-vrowzer:extract')

// oxlint-disable-next-line typescript/no-empty-object-type -- reserved for future options (e.g. pluginOverrides)
export interface ExtractOptions {}

export interface ExtractResult {
  code: string
  unsupported: string[]
}

interface PluginCallInfo {
  calleeName: string
  importSource: string | null
  start: number
  end: number
  hasArgs: boolean
}

interface ImportInfo {
  source: string
  localName: string
  importedName: string | null // null = default, '*' = namespace
  start: number
  end: number
  isTypeOnly: boolean
}

/**
 * Packages that should be excluded from Worker config.
 * These are host-only plugins that cannot run in Web Worker.
 */
const WORKER_EXCLUDED_SOURCES = [
  '@vrowzer/vite-plugin',
  '@vrowzer/vite-plugin/config',
  '@vitejs/devtools'
]

/**
 * Check if an import source should be excluded from Worker config.
 */
export function isWorkerExcludedImport(source: string): boolean {
  return WORKER_EXCLUDED_SOURCES.some(s => source === s || source.startsWith(`${s}/`))
}

/**
 * Check if an import source is from Vite (should be excluded from Worker config).
 */
function isViteImport(source: string): boolean {
  return source === 'vite' || source.startsWith('vite/')
}

/**
 * Extract Worker config source from vite.config.ts.
 *
 * 1. Parse the source with OXC
 * 2. Collect all imports
 * 3. Find `export default defineConfig(...)` or `export default { ... }`
 * 4. Extract plugins array
 * 5. Remove Vrowzer() calls
 * 6. Generate Worker config source
 */
export function extractWorkerConfig(
  source: string,
  configPath: string,
  _options: ExtractOptions = {}
): ExtractResult {
  const unsupported: string[] = []

  const result = parseSync(configPath, source)
  const ast = result.program as Program

  // 1. Collect imports
  const imports = collectImports(ast)
  debug(
    'imports',
    imports.map(i => `${i.localName} from ${i.source}`)
  )

  // 2. Find export default
  const exportDefault = ast.body.find(
    (n): n is ExportDefaultDeclaration => n.type === 'ExportDefaultDeclaration'
  )
  if (!exportDefault) {
    return { code: generateFallbackCode(), unsupported: ['no export default found'] }
  }

  // 3. Find the config object (unwrap defineConfig() if present)
  const configObj = unwrapDefineConfig(exportDefault.declaration as Expression)
  if (!configObj || configObj.type !== 'ObjectExpression') {
    return { code: generateFallbackCode(), unsupported: ['config is not an object expression'] }
  }

  // 4. Find plugins array
  const pluginsProp = (configObj as ObjectExpression).properties.find(
    (p): p is ObjectProperty =>
      p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'plugins'
  )
  if (!pluginsProp || pluginsProp.value.type !== 'ArrayExpression') {
    return { code: generateFallbackCode(), unsupported: ['plugins is not an array'] }
  }

  const pluginsArray = pluginsProp.value as ArrayExpression

  // 5. Analyze each plugin element
  const pluginCalls: PluginCallInfo[] = []
  for (const element of pluginsArray.elements) {
    if (element === null) {
      continue
    }

    if (element.type === 'SpreadElement') {
      unsupported.push(`spread element: ${source.slice(element.start, element.end)}`)
      continue
    }

    const expr = element as Expression
    if (expr.type === 'CallExpression') {
      const info = analyzeCallExpression(expr as CallExpression, imports)
      if (info) {
        pluginCalls.push(info)
      } else {
        unsupported.push(`unanalyzable call: ${source.slice(expr.start, expr.end)}`)
      }
    } else if (expr.type === 'ConditionalExpression' || expr.type === 'LogicalExpression') {
      unsupported.push(`conditional plugin: ${source.slice(expr.start, expr.end)}`)
    } else {
      // Identifier or other - try to resolve
      unsupported.push(`non-call plugin: ${source.slice(expr.start, expr.end)}`)
    }
  }

  if (unsupported.length > 0) {
    debug('unsupported patterns', unsupported)
  }

  // 6. Filter out Vrowzer plugins
  const workerPlugins = pluginCalls.filter(p => {
    if (!p.importSource) {
      return true
    } // local function - keep
    return !isWorkerExcludedImport(p.importSource)
  })
  debug(
    'workerPlugins',
    workerPlugins.map(p => p.calleeName)
  )

  // 7. Determine which imports are needed
  const neededImportSources = new Set<string>()
  const neededLocalNames = new Set<string>()
  for (const plugin of workerPlugins) {
    if (plugin.importSource) {
      neededImportSources.add(plugin.importSource)
    }
    neededLocalNames.add(plugin.calleeName)
  }

  // Collect imports needed for plugin arguments (scan argument source for identifiers)
  for (const plugin of workerPlugins) {
    if (plugin.hasArgs) {
      const argSource = source.slice(plugin.start, plugin.end)
      for (const imp of imports) {
        if (imp.isTypeOnly) {
          continue
        }
        if (isViteImport(imp.source)) {
          continue
        }
        if (isWorkerExcludedImport(imp.source)) {
          continue
        }
        // Check if the import's local name appears in the argument source
        if (argSource.includes(imp.localName)) {
          neededImportSources.add(imp.source)
          neededLocalNames.add(imp.localName)
        }
      }
    }
  }

  // 8. Also include imports for non-imported local function plugins
  // (functions defined in the config file itself need their dependency imports
  //  and dependent variable declarations)
  const localPluginNames = workerPlugins.filter(p => !p.importSource).map(p => p.calleeName)
  if (localPluginNames.length > 0) {
    // Collect local function sources
    const localFuncSources: string[] = []
    for (const stmt of ast.body) {
      if (stmt.type === 'FunctionDeclaration' && stmt.id) {
        const funcName = (stmt.id as { name: string }).name
        if (localPluginNames.includes(funcName)) {
          localFuncSources.push(source.slice(stmt.start, stmt.end))
        }
      }
    }

    // Scan function bodies for import references
    for (const funcSource of localFuncSources) {
      for (const imp of imports) {
        if (imp.isTypeOnly) {
          continue
        }
        if (isViteImport(imp.source)) {
          continue
        }
        if (isWorkerExcludedImport(imp.source)) {
          continue
        }
        if (funcSource.includes(imp.localName)) {
          neededImportSources.add(imp.source)
          neededLocalNames.add(imp.localName)
        }
      }
    }

    // Find variable declarations referenced by local functions and their import deps
    for (const stmt of ast.body) {
      if (stmt.type !== 'VariableDeclaration') {
        continue
      }
      for (const decl of (stmt as any).declarations) {
        if (!decl.id?.name) {
          continue
        }
        const varName = decl.id.name as string
        if (localPluginNames.includes(varName)) {
          continue
        } // skip plugin fn declarations
        const isUsedByLocalFunc = localFuncSources.some(funcSrc => funcSrc.includes(varName))
        if (isUsedByLocalFunc) {
          // This variable is needed — scan its init for import references
          const varSource = source.slice(stmt.start, stmt.end)
          for (const imp of imports) {
            if (imp.isTypeOnly) {
              continue
            }
            if (isViteImport(imp.source)) {
              continue
            }
            if (isWorkerExcludedImport(imp.source)) {
              continue
            }
            if (varSource.includes(imp.localName)) {
              neededImportSources.add(imp.source)
              neededLocalNames.add(imp.localName)
            }
          }
        }
      }
    }
  }

  // 8b. Find top-level config properties to forward (define, etc.)
  const forwardedProps = extractForwardedProperties(source, configObj as ObjectExpression)

  // 9. Generate Worker config source
  const code = generateWorkerSource(
    source,
    ast,
    imports,
    workerPlugins,
    neededImportSources,
    neededLocalNames,
    forwardedProps
  )

  return { code, unsupported }
}

/**
 * Config properties that should be forwarded to Worker config.
 * These are extracted as raw source code from the config object.
 */
const FORWARDED_PROPERTIES = ['define']

function extractForwardedProperties(
  source: string,
  configObj: ObjectExpression
): Map<string, string> {
  const props = new Map<string, string>()
  for (const p of configObj.properties) {
    if (p.type !== 'Property') {
      continue
    }
    const key = p.key.type === 'Identifier' ? p.key.name : null
    if (key && FORWARDED_PROPERTIES.includes(key)) {
      props.set(key, source.slice(p.value.start, p.value.end))
    }
  }
  return props
}

function collectImports(ast: Program): ImportInfo[] {
  const imports: ImportInfo[] = []
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') {
      continue
    }
    const decl = node as ImportDeclaration
    const source = decl.source.value
    const isTypeOnly = decl.importKind === 'type'

    for (const spec of decl.specifiers) {
      if (spec.type === 'ImportDefaultSpecifier') {
        imports.push({
          source,
          localName: spec.local.name,
          importedName: null,
          start: decl.start,
          end: decl.end,
          isTypeOnly
        })
      } else if (spec.type === 'ImportSpecifier') {
        const importedName =
          spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
        imports.push({
          source,
          localName: spec.local.name,
          importedName,
          start: decl.start,
          end: decl.end,
          isTypeOnly: isTypeOnly || spec.importKind === 'type'
        })
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        imports.push({
          source,
          localName: spec.local.name,
          importedName: '*',
          start: decl.start,
          end: decl.end,
          isTypeOnly
        })
      }
    }
  }
  return imports
}

function unwrapDefineConfig(expr: Expression): Expression | null {
  if (expr.type === 'CallExpression') {
    const call = expr as CallExpression
    if (
      call.callee.type === 'Identifier' &&
      (call.callee as { name: string }).name === 'defineConfig'
    ) {
      return call.arguments[0] as Expression | null
    }
  }
  if (expr.type === 'ObjectExpression') {
    return expr
  }
  return null
}

function analyzeCallExpression(call: CallExpression, imports: ImportInfo[]): PluginCallInfo | null {
  let calleeName: string | null = null

  if (call.callee.type === 'Identifier') {
    calleeName = (call.callee as { name: string }).name
  }

  if (!calleeName) {
    return null
  }

  // Find matching import
  const matchingImport = imports.find(i => i.localName === calleeName && !i.isTypeOnly)

  return {
    calleeName,
    importSource: matchingImport?.source ?? null,
    start: call.start,
    end: call.end,
    hasArgs: call.arguments.length > 0
  }
}

function generateWorkerSource(
  source: string,
  ast: Program,
  imports: ImportInfo[],
  plugins: PluginCallInfo[],
  neededImportSources: Set<string>,
  neededLocalNames: Set<string>,
  forwardedProps: Map<string, string> = new Map()
): string {
  const lines: string[] = []

  // Emit needed imports (excluding Vrowzer, Vite, type-only)
  const emittedSources = new Set<string>()
  for (const imp of imports) {
    if (imp.isTypeOnly) {
      continue
    }
    if (isViteImport(imp.source)) {
      continue
    }
    if (isWorkerExcludedImport(imp.source)) {
      continue
    }
    if (!neededImportSources.has(imp.source)) {
      continue
    }
    if (!neededLocalNames.has(imp.localName)) {
      continue
    }
    if (emittedSources.has(`${imp.source}:${imp.localName}`)) {
      continue
    }
    emittedSources.add(`${imp.source}:${imp.localName}`)

    // Group imports from the same source
    // For simplicity, emit individual import statements
    if (imp.importedName === null) {
      // default import
      lines.push(`import ${imp.localName} from '${imp.source}'`)
    } else if (imp.importedName === '*') {
      // namespace import
      lines.push(`import * as ${imp.localName} from '${imp.source}'`)
    } else if (imp.importedName === imp.localName) {
      lines.push(`import { ${imp.localName} } from '${imp.source}'`)
    } else {
      lines.push(`import { ${imp.importedName} as ${imp.localName} } from '${imp.source}'`)
    }
  }

  // Emit local function definitions and their dependent variable declarations
  const localPluginNames = plugins.filter(p => !p.importSource).map(p => p.calleeName)

  // Collect local function sources to scan for variable references
  const localFuncSources: string[] = []
  for (const stmt of ast.body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      const funcName = (stmt.id as { name: string }).name
      if (localPluginNames.includes(funcName)) {
        localFuncSources.push(source.slice(stmt.start, stmt.end))
      }
    }
  }

  // Find variable declarations referenced by local functions
  const emittedVarNames = new Set<string>()
  for (const stmt of ast.body) {
    if (stmt.type !== 'VariableDeclaration') {
      continue
    }
    for (const decl of (stmt as any).declarations) {
      if (!decl.id?.name) {
        continue
      }
      const varName = decl.id.name as string
      // Check if any local function references this variable
      const isUsedByLocalFunc = localFuncSources.some(funcSrc => funcSrc.includes(varName))
      if (isUsedByLocalFunc && !localPluginNames.includes(varName)) {
        if (!emittedVarNames.has(varName)) {
          emittedVarNames.add(varName)
          lines.push('')
          lines.push(source.slice(stmt.start, stmt.end))

          // Also include imports used by this variable declaration
          const varSource = source.slice(stmt.start, stmt.end)
          for (const imp of imports) {
            if (imp.isTypeOnly) {
              continue
            }
            if (isViteImport(imp.source)) {
              continue
            }
            if (isWorkerExcludedImport(imp.source)) {
              continue
            }
            if (varSource.includes(imp.localName)) {
              neededImportSources.add(imp.source)
              neededLocalNames.add(imp.localName)
            }
          }
        }
        break
      }
    }
  }

  // Emit local function definitions
  for (const stmt of ast.body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      const funcName = (stmt.id as { name: string }).name
      if (localPluginNames.includes(funcName)) {
        lines.push('')
        lines.push(source.slice(stmt.start, stmt.end))
      }
    }
    // Also handle variable declarations that define plugin functions
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of (stmt as any).declarations) {
        if (decl.id?.name && localPluginNames.includes(decl.id.name)) {
          lines.push('')
          lines.push(source.slice(stmt.start, stmt.end))
          break
        }
      }
    }
  }

  // Generate plugins array
  lines.push('')
  lines.push('export default {')
  lines.push('  plugins: [')

  for (const plugin of plugins) {
    const callSource = source.slice(plugin.start, plugin.end)
    lines.push(`    ${callSource},`)
  }

  lines.push('  ],')

  // Emit forwarded properties (define, etc.)
  for (const [key, value] of forwardedProps) {
    lines.push(`  ${key}: ${value},`)
  }

  lines.push('}')

  return lines.join('\n')
}

function generateFallbackCode(): string {
  return 'export default { plugins: [] }'
}
