/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { createUnplugin } from 'unplugin'
import { resolveOptions } from './core/options.ts'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './core/options.ts'

export const Starter: UnpluginInstance<Options | undefined, false> = createUnplugin(
  (rawOptions = {}) => {
    const options = resolveOptions(rawOptions)

    const name = 'unplugin-starter'
    return {
      name,
      enforce: options.enforce,

      transform: {
        filter: {
          id: { include: options.include, exclude: options.exclude }
        },
        handler(code, _id) {
          return `// unplugin-starter injected\n${code}`
        }
      }
    }
  }
)
