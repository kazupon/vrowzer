// TODO: fill in later ...

import {
  CSS_LANGS_RE
} from '../constants'

// TODO: fill in later ...

const cssModuleRE = new RegExp(`\\.module${CSS_LANGS_RE.source}`)
const directRequestRE = /[?&]direct\b/
const htmlProxyRE = /[?&]html-proxy\b/
const htmlProxyIndexRE = /&index=(\d+)/
const commonjsProxyRE = /[?&]commonjs-proxy/
const inlineRE = /[?&]inline\b/
const inlineCSSRE = /[?&]inline-css\b/
const styleAttrRE = /[?&]style-attr\b/
const functionCallRE = /^[A-Z_][.\w-]*\(/i
const transformOnlyRE = /[?&]transform-only\b/
const nonEscapedDoubleQuoteRe = /(?<!\\)"/g

const defaultCssBundleName = 'style.css'

const enum PreprocessLang {
  less = 'less',
  sass = 'sass',
  scss = 'scss',
  styl = 'styl',
  stylus = 'stylus',
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- bug in typescript-eslint
const enum PureCssLang {
  css = 'css',
}
const enum PostCssDialectLang {
  sss = 'sugarss',
}
type CssLang =
  | keyof typeof PureCssLang
  | keyof typeof PreprocessLang
  | keyof typeof PostCssDialectLang

export const isModuleCSSRequest = (request: string): boolean =>
  cssModuleRE.test(request)

export const isDirectCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request) && directRequestRE.test(request)

export const isDirectRequest = (request: string): boolean =>
  directRequestRE.test(request)

// TODO: fill in later ...
