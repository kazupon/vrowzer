/**
 * SPIKE (#36): rewrite the Worker config entry into a function that creates the config.
 *
 * Upstream Vite imports the config file again for each `build()`, so that each build gets new
 * plugin instances, while the packages it imports stay cached. The build Worker calls the function
 * for each build to do the same: imports stay at the module top level, and the other statements
 * run again in each call.
 *
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import MagicString from 'magic-string'
import { parseConfigModule } from './worker-config.ts'

import type { Plugin as RolldownPlugin } from 'rolldown'

const DEFAULT_BINDING = '__vrowzer_config__'
const FACTORY_NAME = '__vrowzer_createConfig__'

export function toConfigFactory(code: string, filename: string): string {
  // Plugin transforms see the source before rolldown strips the types, so parse it as it is
  const program = parseConfigModule(code, filename) as unknown as {
    body: Array<{
      type: string
      start: number
      end: number
      declaration?: { type: string; start: number; end: number; id?: { name: string } | null }
      specifiers?: unknown[]
      source?: unknown
    }>
  }
  const s = new MagicString(code)
  const imports: string[] = []
  let hasDefault = false
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') {
      imports.push(code.slice(node.start, node.end))
      s.remove(node.start, node.end)
      continue
    }
    if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
      hasDefault = true
      const declaration = node.declaration
      if (
        (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') &&
        declaration.id
      ) {
        // export default function name() {} → function name() {}; const __vrowzer_config__ = name
        s.remove(node.start, declaration.start)
        s.appendLeft(node.end, `\nconst ${DEFAULT_BINDING} = ${declaration.id.name}`)
      } else {
        s.overwrite(node.start, declaration.start, `const ${DEFAULT_BINDING} = `)
      }
      continue
    }
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        // export const a = 1 → const a = 1
        s.remove(node.start, node.declaration.start)
      } else if (!node.source) {
        // export { a, b } → removed
        s.remove(node.start, node.end)
      } else {
        throw new Error(`[vrowzer] Re-exports are not supported in the Worker config: ${filename}`)
      }
    }
    if (node.type === 'ExportAllDeclaration') {
      throw new Error(`[vrowzer] Re-exports are not supported in the Worker config: ${filename}`)
    }
  }
  if (!hasDefault) {
    throw new Error(`[vrowzer] The Worker config must have a default export: ${filename}`)
  }
  s.prepend(`export default async function ${FACTORY_NAME}() {\n`)
  s.append(`\nreturn ${DEFAULT_BINDING}\n}\n`)
  s.prepend(`${imports.join('\n')}\n`)
  return s.toString()
}

/**
 * Rewrites the given entry modules into config factories, after the other transforms.
 */
export function configFactoryPlugin(isEntry: (id: string) => boolean): RolldownPlugin {
  return {
    name: 'vrowzer:worker-config-factory',
    transform: {
      order: 'post',
      handler(code, id) {
        if (!isEntry(id)) {
          return
        }
        return { code: toConfigFactory(code, id), map: null }
      }
    }
  }
}
