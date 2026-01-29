// TODO: fill in code later ...

const htmlProxyRE =
  /[?&]html-proxy=?(?:&inline-css)?(?:&style-attr)?&index=(\d+)\.(?:js|css)$/
const isHtmlProxyRE = /[?&]html-proxy\b/

const inlineCSSRE = /__VITE_INLINE_CSS__([a-z\d]{8}_\d+)__/g
// Do not allow preceding '.', but do allow preceding '...' for spread operations
const inlineImportRE =
  /(?<!(?<!\.\.)\.)\bimport\s*\(("(?:[^"]|(?<=\\)")*"|'(?:[^']|(?<=\\)')*')\)/dg
const htmlLangRE = /\.(?:html|htm)$/
const spaceRe = /[\t\n\f\r ]/

const importMapRE =
  /[ \t]*<script[^>]*type\s*=\s*(?:"importmap"|'importmap'|importmap)[^>]*>.*?<\/script>/is
const moduleScriptRE =
  /[ \t]*<script[^>]*type\s*=\s*(?:"module"|'module'|module)[^>]*>/i
const modulePreloadLinkRE =
  /[ \t]*<link[^>]*rel\s*=\s*(?:"modulepreload"|'modulepreload'|modulepreload)[\s\S]*?\/>/i
const importMapAppendRE = new RegExp(
  [moduleScriptRE, modulePreloadLinkRE].map((r) => r.source).join('|'),
  'i',
)

export const isHTMLProxy = (id: string): boolean => isHtmlProxyRE.test(id)

// TODO: fill in code later ...
