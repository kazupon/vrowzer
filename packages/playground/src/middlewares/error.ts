import colors from 'picocolors'
import { pad } from '../utils.ts'

import type { RollupError } from '@rolldown/browser'

export function buildErrorMessage(
  err: RollupError,
  args: string[] = [],
  includeStack = true
): string {
  if (err.plugin) args.push(`  Plugin: ${colors.magenta(err.plugin)}`)
  const loc = err.loc ? `:${err.loc.line}:${err.loc.column}` : ''
  if (err.id) args.push(`  File: ${colors.cyan(err.id)}${loc}`)
  if (err.frame) args.push(colors.yellow(pad(err.frame)))
  if (includeStack && err.stack) args.push(pad(cleanStack(err.stack)))
  return args.join('\n')
}

function cleanStack(stack: string) {
  return stack
    .split(/\n/)
    .filter(l => /^\s*at/.test(l))
    .join('\n')
}
