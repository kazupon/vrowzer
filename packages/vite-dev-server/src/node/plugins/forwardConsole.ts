import fs from 'node:fs'
import path from 'node:path'
import { parseErrorStacktrace } from '@vitest/utils/source-map'
import c from 'picocolors'
import type { ForwardConsolePayload } from '#types/customEvent'
import type { Plugin } from '../plugin'
import type { DevEnvironment } from '../server/environment'
import {
  generateCodeFrame,
  normalizePath,
  stripBase,
} from '../utils'

export function forwardConsolePlugin(pluginOptions: {
  environments: string[]
}): Plugin {
  const sourceMapCache = new Map<string, any>()

  return {
    name: 'vite:forward-console',
    apply: 'serve',
    configureServer(server) {
      for (const name of pluginOptions.environments) {
        const environment = server.environments[name]
        environment.hot.on('vite:forward-console', (payload) => {
          if (
            payload.type === 'error' ||
            payload.type === 'unhandled-rejection'
          ) {
            const output = formatError(payload, environment, sourceMapCache)
            environment.config.logger.error(output, {
              timestamp: true,
            })
          } else {
            const output =
              c.dim(`[console.${payload.data.level}] `) + payload.data.message
            if (payload.data.level === 'error') {
              environment.config.logger.error(output, {
                timestamp: true,
              })
            } else if (payload.data.level === 'warn') {
              environment.config.logger.warn(output, {
                timestamp: true,
              })
            } else {
              environment.config.logger.info(output, {
                timestamp: true,
              })
            }
          }
        })
      }
    },
  }
}

function formatError(
  payload: Extract<
    ForwardConsolePayload,
    { type: 'error' | 'unhandled-rejection' }
  >,
  environment: DevEnvironment,
  sourceMapCache: Map<string, any>,
) {
  const error = payload.data
  const stacks = parseErrorStacktrace(error, {
    getUrlId(id) {
      const moduleGraph = environment.moduleGraph
      const strippedId = stripBase(id, environment.config.base)
      const candidates = strippedId === id ? [id] : [id, strippedId]

      for (const candidate of candidates) {
        const mod = moduleGraph.getModuleById(candidate)
        if (mod) {
          return candidate
        }

        const resolvedPath = normalizePath(
          path.resolve(environment.config.root, candidate.slice(1)),
        )
        const resolvedModule = moduleGraph.getModuleById(resolvedPath)
        if (resolvedModule) {
          return resolvedPath
        }

        // Some browsers omit queries in stack traces. Use the first module
        // whose file resolves to the reported path as the next best match.
        const files = moduleGraph.getModulesByFile(resolvedPath)
        if (files?.size) {
          return files.values().next().value!.id!
        }
      }

      return strippedId
    },
    getSourceMap(id) {
      if (sourceMapCache.has(id)) {
        return sourceMapCache.get(id)
      }

      const map =
        environment.moduleGraph.getModuleById(id)?.transformResult?.map ?? null
      sourceMapCache.set(id, map)
      return map
    },
    ignoreStackEntries: [],
  })

  const nearest = stacks.find((stack) => {
    const modules = environment.moduleGraph.getModulesByFile(stack.file)
    return (
      [...(modules || [])].some((module) => module.transformResult) &&
      fs.existsSync(stack.file)
    )
  })

  let output = ''
  const title =
    payload.type === 'unhandled-rejection'
      ? '[Unhandled rejection]'
      : '[Unhandled error]'
  output += c.red(`${title} ${c.bold(error.name)}: ${error.message}\n`)
  for (const stack of stacks) {
    const file = normalizePath(
      path.relative(environment.config.root, stack.file),
    )
    output += ` > ${[stack.method, `${file}:${stack.line}:${stack.column}`]
      .filter(Boolean)
      .join(' ')}\n`
    if (stack === nearest) {
      const code = fs.readFileSync(stack.file, 'utf-8')
      output += generateCodeFrame(code, stack).replace(/^/gm, '    ')
      output += '\n'
    }
  }
  return output
}
