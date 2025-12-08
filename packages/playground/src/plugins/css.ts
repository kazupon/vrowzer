import { CSS_LANGS_RE } from '../constants.ts'

import type { CSSOptions } from 'vite'

const _cssConfigDefaults = Object.freeze({
  /** @experimental */
  transformer: 'postcss',
  // modules
  // preprocessorOptions
  preprocessorMaxWorkers: true,
  // postcss
  /** @experimental */
  devSourcemap: false
  // lightningcss
} satisfies CSSOptions)
export const cssConfigDefaults: Readonly<Partial<CSSOptions>> = _cssConfigDefaults

const directRequestRE = /[?&]direct\b/

export const isDirectCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request) && directRequestRE.test(request)
