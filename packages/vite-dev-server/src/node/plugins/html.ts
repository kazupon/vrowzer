import escapeHtml from 'escape-html'
import MagicString from 'magic-string'
import path from 'node:path'
import type {
  DefaultTreeAdapterMap,
  ErrorCodes,
  ParserError,
  Token,
} from 'parse5'
import colors from 'picocolors'
import type {
  OutputBundle,
  OutputChunk,
  RollupError,
  SourceMapInput
} from 'rolldown'
import { stripLiteral } from 'strip-literal'
import { cleanUrl } from '../../shared/utils'
import type { ResolvedConfig } from '../config'
// NOTE(kazupon): commented out, because env will not be supported in vrowser yet
// import { resolveEnvPrefix } from '../env'
import type { Logger } from '../logger'
import type { MinimalPluginContextWithoutEnvironment, Plugin } from '../plugin'
import type { ViteDevServer } from '../server'
import {
  generateCodeFrame,
  normalizePath,
  unique
} from '../utils'

interface ScriptAssetsUrl {
  start: number
  end: number
  url: string
}

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

export const isHTMLRequest = (request: string): boolean =>
  htmlLangRE.test(request)

// HTML Proxy Caches are stored by config -> filePath -> index
export const htmlProxyMap: WeakMap<
  ResolvedConfig,
  Map<
    string,
    {
      code: string
      map?: SourceMapInput
    }[]
  >
> = new WeakMap()

// HTML Proxy Transform result are stored by config
// `${hash(importer)}_${query.index}` -> transformed css code
// PS: key like `hash(/vite/playground/assets/index.html)_1`)
export const htmlProxyResult: Map<string, string> = new Map()

export function htmlInlineProxyPlugin(config: ResolvedConfig): Plugin {
  // Should do this when `constructor` rather than when `buildStart`,
  // `buildStart` will be triggered multiple times then the cached result will be emptied.
  // https://github.com/vitejs/vite/issues/6372
  htmlProxyMap.set(config, new Map())
  return {
    name: 'vite:html-inline-proxy',

    resolveId: {
      filter: { id: isHtmlProxyRE },
      handler(id) {
        return id
      },
    },

    load: {
      filter: { id: isHtmlProxyRE },
      handler(id) {
        const proxyMatch = htmlProxyRE.exec(id)
        if (proxyMatch) {
          const index = Number(proxyMatch[1])
          const file = cleanUrl(id)
          const url = file.replace(normalizePath(config.root), '')
          const result = htmlProxyMap.get(config)!.get(url)?.[index]
          if (result) {
            // set moduleSideEffects to keep the module even if `treeshake.moduleSideEffects=false` is set
            return { ...result, moduleSideEffects: true }
          } else {
            throw new Error(`No matching HTML proxy module found from ${id}`)
          }
        }
      },
    },
  }
}

export function addToHTMLProxyCache(
  config: ResolvedConfig,
  filePath: string,
  index: number,
  result: { code: string; map?: SourceMapInput },
): void {
  if (!htmlProxyMap.get(config)) {
    htmlProxyMap.set(config, new Map())
  }
  if (!htmlProxyMap.get(config)!.get(filePath)) {
    htmlProxyMap.get(config)!.set(filePath, [])
  }
  htmlProxyMap.get(config)!.get(filePath)![index] = result
}

export function addToHTMLProxyTransformResult(
  hash: string,
  code: string,
): void {
  htmlProxyResult.set(hash, code)
}

// Some `<link rel>` elements should not be inlined in build. Excluding:
// - `shortcut`                     : only valid for IE <9, use `icon`
// - `mask-icon`                    : deprecated since Safari 12 (for pinned tabs)
// - `apple-touch-icon-precomposed` : only valid for iOS <7 (for avoiding gloss effect)
const noInlineLinkRels = new Set([
  'icon',
  'apple-touch-icon',
  'apple-touch-startup-image',
  'manifest',
])

export const isAsyncScriptMap: WeakMap<
  ResolvedConfig,
  Map<string, boolean>
> = new WeakMap()

export function nodeIsElement(
  node: DefaultTreeAdapterMap['node'],
): node is DefaultTreeAdapterMap['element'] {
  return node.nodeName[0] !== '#'
}

function traverseNodes(
  node: DefaultTreeAdapterMap['node'],
  visitor: (node: DefaultTreeAdapterMap['node']) => void,
) {
  if (node.nodeName === 'template') {
    node = (node as DefaultTreeAdapterMap['template']).content
  }
  visitor(node)
  if (
    nodeIsElement(node) ||
    node.nodeName === '#document' ||
    node.nodeName === '#document-fragment'
  ) {
    node.childNodes.forEach((childNode) => traverseNodes(childNode, visitor))
  }
}

type ParseWarnings = Partial<Record<ErrorCodes, string>>

export async function traverseHtml(
  html: string,
  filePath: string,
  warn: Logger['warn'],
  visitor: (node: DefaultTreeAdapterMap['node']) => void,
): Promise<void> {
  // lazy load compiler
  const { parse } = await import('parse5')
  const warnings: ParseWarnings = {}
  const ast = parse(html, {
    scriptingEnabled: false, // parse inside <noscript>
    sourceCodeLocationInfo: true,
    onParseError: (e: ParserError) => {
      handleParseError(e, html, filePath, warnings)
    },
  })
  traverseNodes(ast, visitor)

  for (const message of Object.values(warnings)) {
    warn(colors.yellow(`\n${message}`))
  }
}

export function getScriptInfo(node: DefaultTreeAdapterMap['element']): {
  src: Token.Attribute | undefined
  srcSourceCodeLocation: Token.Location | undefined
  isModule: boolean
  isAsync: boolean
  isIgnored: boolean
} {
  let src: Token.Attribute | undefined
  let srcSourceCodeLocation: Token.Location | undefined
  let isModule = false
  let isAsync = false
  let isIgnored = false
  for (const p of node.attrs) {
    if (p.prefix !== undefined) continue
    if (p.name === 'src') {
      if (!src) {
        src = p
        srcSourceCodeLocation = node.sourceCodeLocation?.attrs!['src']
      }
    } else if (p.name === 'type' && p.value === 'module') {
      isModule = true
    } else if (p.name === 'async') {
      isAsync = true
    } else if (p.name === 'vite-ignore') {
      isIgnored = true
    }
  }
  return { src, srcSourceCodeLocation, isModule, isAsync, isIgnored }
}

const attrValueStartRE = /=\s*(.)/

export function overwriteAttrValue(
  s: MagicString,
  sourceCodeLocation: Token.Location,
  newValue: string,
): MagicString {
  const srcString = s.slice(
    sourceCodeLocation.startOffset,
    sourceCodeLocation.endOffset,
  )
  const valueStart = attrValueStartRE.exec(srcString)
  if (!valueStart) {
    // overwrite attr value can only be called for a well-defined value
    throw new Error(
      `[vite:html] internal error, failed to overwrite attribute value`,
    )
  }
  const wrapOffset = valueStart[1] === '"' || valueStart[1] === "'" ? 1 : 0
  const valueOffset = valueStart.index! + valueStart[0].length - 1
  s.update(
    sourceCodeLocation.startOffset + valueOffset + wrapOffset,
    sourceCodeLocation.endOffset - wrapOffset,
    newValue,
  )
  return s
}

export function removeViteIgnoreAttr(
  s: MagicString,
  sourceCodeLocation: Token.Location,
): MagicString {
  const loc = (sourceCodeLocation as Token.LocationWithAttributes).attrs?.[
    'vite-ignore'
  ]
  if (loc) {
    s.remove(loc.startOffset, loc.endOffset)
  }
  return s
}

/**
 * Format parse5 @type {ParserError} to @type {RollupError}
 */
function formatParseError(parserError: ParserError, id: string, html: string) {
  const formattedError = {
    code: parserError.code,
    message: `parse5 error code ${parserError.code}`,
    frame: generateCodeFrame(
      html,
      parserError.startOffset,
      parserError.endOffset,
    ),
    loc: {
      file: id,
      line: parserError.startLine,
      column: parserError.startCol,
    },
  } satisfies RollupError
  return formattedError
}

function handleParseError(
  parserError: ParserError,
  html: string,
  filePath: string,
  warnings: ParseWarnings,
) {
  switch (parserError.code) {
    case 'missing-doctype':
      // ignore missing DOCTYPE
      return
    case 'abandoned-head-element-child':
      // Accept elements without closing tag in <head>
      return
    case 'duplicate-attribute':
      // Accept duplicate attributes #5966
      // The first attribute is used, browsers silently ignore duplicates
      return
    case 'non-void-html-element-start-tag-with-trailing-solidus':
      // Allow self closing on non-void elements #10439
      return
    case 'unexpected-question-mark-instead-of-tag-name':
      // Allow <?xml> declaration and <?> empty elements
      // lit generates <?>: https://github.com/lit/lit/issues/2470
      return
  }
  const parseError = formatParseError(parserError, filePath, html)
  warnings[parseError.code] ??=
    `Unable to parse HTML; ${parseError.message}\n` +
    ` at ${parseError.loc.file}:${parseError.loc.line}:${parseError.loc.column}\n` +
    parseError.frame
}

// TODO: fill in code later ...

export function parseRelAttr(attr: string): string[] {
  return attr.split(spaceRe).map((v) => v.toLowerCase())
}

// <tag style="... url(...) or image-set(...) ..."></tag>
// extract inline styles as virtual css
export function findNeedTransformStyleAttribute(
  node: DefaultTreeAdapterMap['element'],
): { attr: Token.Attribute; location?: Token.Location } | undefined {
  const attr = node.attrs.find(
    (prop) =>
      prop.prefix === undefined &&
      prop.name === 'style' &&
      // only url(...) or image-set(...) in css need to emit file
      (prop.value.includes('url(') || prop.value.includes('image-set(')),
  )
  if (!attr) return undefined
  const location = node.sourceCodeLocation?.attrs?.['style']
  return { attr, location }
}

export function extractImportExpressionFromClassicScript(
  scriptTextNode: DefaultTreeAdapterMap['textNode'],
): ScriptAssetsUrl[] {
  const startOffset = scriptTextNode.sourceCodeLocation!.startOffset
  const cleanCode = stripLiteral(scriptTextNode.value)

  const scriptUrls: ScriptAssetsUrl[] = []
  let match: RegExpExecArray | null
  inlineImportRE.lastIndex = 0
  while ((match = inlineImportRE.exec(cleanCode))) {
    const [, [urlStart, urlEnd]] = match.indices!
    const start = urlStart + 1
    const end = urlEnd - 1
    scriptUrls.push({
      start: start + startOffset,
      end: end + startOffset,
      url: scriptTextNode.value.slice(start, end),
    })
  }
  return scriptUrls
}

export interface HtmlTagDescriptor {
  tag: string
  /**
   * attribute values will be escaped automatically if needed
   */
  attrs?: Record<string, string | boolean | undefined>
  children?: string | HtmlTagDescriptor[]
  /**
   * default: 'head-prepend'
   */
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
}

export type IndexHtmlTransformResult =
  | string
  | HtmlTagDescriptor[]
  | {
    html: string
    tags: HtmlTagDescriptor[]
  }

export interface IndexHtmlTransformContext {
  /**
   * public path when served
   */
  path: string
  /**
   * filename on disk
   */
  filename: string
  server?: ViteDevServer
  bundle?: OutputBundle
  chunk?: OutputChunk
  originalUrl?: string
}

export type IndexHtmlTransformHook = (
  this: MinimalPluginContextWithoutEnvironment,
  html: string,
  ctx: IndexHtmlTransformContext,
) => IndexHtmlTransformResult | void | Promise<IndexHtmlTransformResult | void>

export type IndexHtmlTransform =
  | IndexHtmlTransformHook
  | {
    order?: 'pre' | 'post' | null
    handler: IndexHtmlTransformHook
  }

export function preImportMapHook(
  config: ResolvedConfig,
): IndexHtmlTransformHook {
  return (html, ctx) => {
    const importMapIndex = html.search(importMapRE)
    if (importMapIndex < 0) return

    const importMapAppendIndex = html.search(importMapAppendRE)
    if (importMapAppendIndex < 0) return

    if (importMapAppendIndex < importMapIndex) {
      const relativeHtml = normalizePath(
        path.relative(config.root, ctx.filename),
      )
      config.logger.warnOnce(
        colors.yellow(
          colors.bold(
            `(!) <script type="importmap"> should come before <script type="module"> and <link rel="modulepreload"> in /${relativeHtml}`,
          ),
        ),
      )
    }
  }
}

/**
 * Move importmap before the first module script and modulepreload link
 */
export function postImportMapHook(): IndexHtmlTransformHook {
  return (html) => {
    if (!importMapAppendRE.test(html)) return

    let importMap: string | undefined
    html = html.replace(importMapRE, (match) => {
      importMap = match
      return ''
    })

    if (importMap) {
      html = html.replace(
        importMapAppendRE,
        (match) => `${importMap}\n${match}`,
      )
    }

    return html
  }
}

export function injectCspNonceMetaTagHook(
  config: ResolvedConfig,
): IndexHtmlTransformHook {
  return () => {
    if (!config.html?.cspNonce) return

    return [
      {
        tag: 'meta',
        injectTo: 'head',
        // use nonce attribute so that it's hidden
        // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce#accessing_nonces_and_nonce_hiding
        attrs: { property: 'csp-nonce', nonce: config.html.cspNonce },
      },
    ]
  }
}

/**
 * Support `%ENV_NAME%` syntax in html files
 */
export function htmlEnvHook(config: ResolvedConfig): IndexHtmlTransformHook {
  const pattern = /%(\S+?)%/g
  const envPrefix: string[] = []
  // NOTE(kazupon): commented out, because env will not be supported in vrowser yet
  // const envPrefix = resolveEnvPrefix({ envPrefix: config.envPrefix })
  const env: Record<string, any> = { ...config.env }

  // account for user env defines
  for (const key in config.define) {
    if (key.startsWith(`import.meta.env.`)) {
      const val = config.define[key]
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          env[key.slice(16)] = typeof parsed === 'string' ? parsed : val
        } catch {
          env[key.slice(16)] = val
        }
      } else {
        env[key.slice(16)] = JSON.stringify(val)
      }
    }
  }
  return (html, ctx) => {
    return html.replace(pattern, (text, key) => {
      if (key in env) {
        return env[key]
      } else {
        if (envPrefix.some((prefix) => key.startsWith(prefix))) {
          const relativeHtml = normalizePath(
            path.relative(config.root, ctx.filename),
          )
          config.logger.warn(
            colors.yellow(
              colors.bold(
                `(!) ${text} is not defined in env variables found in /${relativeHtml}. ` +
                `Is the variable mistyped?`,
              ),
            ),
          )
        }

        return text
      }
    })
  }
}

export function injectNonceAttributeTagHook(
  config: ResolvedConfig,
): IndexHtmlTransformHook {
  const processRelType = new Set(['stylesheet', 'modulepreload', 'preload'])

  return async (html, { filename }) => {
    const nonce = config.html?.cspNonce
    if (!nonce) return

    const s = new MagicString(html)

    await traverseHtml(html, filename, config.logger.warn, (node) => {
      if (!nodeIsElement(node)) {
        return
      }

      const { nodeName, attrs, sourceCodeLocation } = node

      if (
        nodeName === 'script' ||
        nodeName === 'style' ||
        (nodeName === 'link' &&
          attrs.some(
            (attr) =>
              attr.name === 'rel' &&
              parseRelAttr(attr.value).some((a) => processRelType.has(a)),
          ))
      ) {
        // If we already have a nonce attribute, we don't need to add another one
        if (attrs.some(({ name }) => name === 'nonce')) {
          return
        }

        const startTagEndOffset = sourceCodeLocation!.startTag!.endOffset

        // if the closing of the start tag includes a `/`, the offset should be 2 so the nonce
        // is appended prior to the `/`
        const appendOffset = html[startTagEndOffset - 2] === '/' ? 2 : 1

        s.appendRight(startTagEndOffset - appendOffset, ` nonce="${nonce}"`)
      }
    })

    return s.toString()
  }
}

export function resolveHtmlTransforms(
  plugins: readonly Plugin[],
): [
    IndexHtmlTransformHook[],
    IndexHtmlTransformHook[],
    IndexHtmlTransformHook[],
  ] {
  const preHooks: IndexHtmlTransformHook[] = []
  const normalHooks: IndexHtmlTransformHook[] = []
  const postHooks: IndexHtmlTransformHook[] = []

  for (const plugin of plugins) {
    const hook = plugin.transformIndexHtml
    if (!hook) continue

    if (typeof hook === 'function') {
      normalHooks.push(hook)
    } else {
      const handler = hook.handler
      if (hook.order === 'pre') {
        preHooks.push(handler)
      } else if (hook.order === 'post') {
        postHooks.push(handler)
      } else {
        normalHooks.push(handler)
      }
    }
  }

  return [preHooks, normalHooks, postHooks]
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head#see_also
const elementsAllowedInHead = new Set([
  'title',
  'base',
  'link',
  'style',
  'meta',
  'script',
  'noscript',
  'template',
])

function headTagInsertCheck(
  tags: HtmlTagDescriptor[],
  ctx: IndexHtmlTransformContext,
) {
  if (!tags.length) return
  const { logger } = ctx.server?.config || {}
  const disallowedTags = tags.filter(
    (tagDescriptor) => !elementsAllowedInHead.has(tagDescriptor.tag),
  )

  if (disallowedTags.length) {
    const dedupedTags = unique(
      disallowedTags.map((tagDescriptor) => `<${tagDescriptor.tag}>`),
    )
    logger?.warn(
      colors.yellow(
        colors.bold(
          `[${dedupedTags.join(',')}] can not be used inside the <head> Element, please check the 'injectTo' value`,
        ),
      ),
    )
  }
}

export async function applyHtmlTransforms(
  html: string,
  hooks: IndexHtmlTransformHook[],
  pluginContext: MinimalPluginContextWithoutEnvironment,
  ctx: IndexHtmlTransformContext,
): Promise<string> {
  for (const hook of hooks) {
    const res = await hook.call(pluginContext, html, ctx)
    if (!res) {
      continue
    }
    if (typeof res === 'string') {
      html = res
    } else {
      let tags: HtmlTagDescriptor[]
      if (Array.isArray(res)) {
        tags = res
      } else {
        html = res.html || html
        tags = res.tags
      }

      let headTags: HtmlTagDescriptor[] | undefined
      let headPrependTags: HtmlTagDescriptor[] | undefined
      let bodyTags: HtmlTagDescriptor[] | undefined
      let bodyPrependTags: HtmlTagDescriptor[] | undefined

      for (const tag of tags) {
        switch (tag.injectTo) {
          case 'body':
            ; (bodyTags ??= []).push(tag)
            break
          case 'body-prepend':
            ; (bodyPrependTags ??= []).push(tag)
            break
          case 'head':
            ; (headTags ??= []).push(tag)
            break
          default:
            ; (headPrependTags ??= []).push(tag)
        }
      }
      headTagInsertCheck([...(headTags || []), ...(headPrependTags || [])], ctx)
      if (headPrependTags) html = injectToHead(html, headPrependTags, true)
      if (headTags) html = injectToHead(html, headTags)
      if (bodyPrependTags) html = injectToBody(html, bodyPrependTags, true)
      if (bodyTags) html = injectToBody(html, bodyTags)
    }
  }

  return html
}

const entirelyImportRE =
  /^(?:import\s*(?:"[^"\n]*[^\\\n]"|'[^'\n]*[^\\\n]');*|\/\*[\s\S]*?\*\/|\/\/.*[$\n])*$/
function isEntirelyImport(code: string) {
  // only consider "side-effect" imports, which match <script type=module> semantics exactly
  // the regexes will remove too little in some exotic cases, but false-negatives are alright
  return entirelyImportRE.test(code.trim())
}

function getBaseInHTML(urlRelativePath: string, config: ResolvedConfig) {
  // Prefer explicit URL if defined for linking to assets and public files from HTML,
  // even when base relative is specified
  return config.base === './' || config.base === ''
    ? path.posix.join(
      path.posix.relative(urlRelativePath, '').slice(0, -2),
      './',
    )
    : config.base
}

const headInjectRE = /([ \t]*)<\/head>/i
const headPrependInjectRE = /([ \t]*)<head[^>]*>/i

const htmlInjectRE = /<\/html>/i
const htmlPrependInjectRE = /([ \t]*)<html[^>]*>/i

const bodyInjectRE = /([ \t]*)<\/body>/i
const bodyPrependInjectRE = /([ \t]*)<body[^>]*>/i

const doctypePrependInjectRE = /<!doctype html>/i

function injectToHead(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false,
) {
  if (tags.length === 0) return html

  if (prepend) {
    // inject as the first element of head
    if (headPrependInjectRE.test(html)) {
      return html.replace(
        headPrependInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`,
      )
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      // respect indentation of head tag
      return html.replace(
        headInjectRE,
        (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`,
      )
    }
    // try to inject before the body tag
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(
        bodyPrependInjectRE,
        (match, p1) => `${serializeTags(tags, p1)}\n${match}`,
      )
    }
  }
  // if no head tag is present, we prepend the tag for both prepend and append
  return prependInjectFallback(html, tags)
}

function injectToBody(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false,
) {
  if (tags.length === 0) return html

  if (prepend) {
    // inject after body open
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(
        bodyPrependInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`,
      )
    }
    // if no there is no body tag, inject after head or fallback to prepend in html
    if (headInjectRE.test(html)) {
      return html.replace(
        headInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, p1)}`,
      )
    }
    return prependInjectFallback(html, tags)
  } else {
    // inject before body close
    if (bodyInjectRE.test(html)) {
      return html.replace(
        bodyInjectRE,
        (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`,
      )
    }
    // if no body tag is present, append to the html tag, or at the end of the file
    if (htmlInjectRE.test(html)) {
      return html.replace(htmlInjectRE, `${serializeTags(tags)}\n$&`)
    }
    return html + `\n` + serializeTags(tags)
  }
}

function prependInjectFallback(html: string, tags: HtmlTagDescriptor[]) {
  // prepend to the html tag, append after doctype, or the document start
  if (htmlPrependInjectRE.test(html)) {
    return html.replace(htmlPrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  if (doctypePrependInjectRE.test(html)) {
    return html.replace(doctypePrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  return serializeTags(tags) + html
}

const unaryTags = new Set(['link', 'meta', 'base'])

function serializeTag(
  { tag, attrs, children }: HtmlTagDescriptor,
  indent: string = '',
): string {
  if (unaryTags.has(tag)) {
    return `<${tag}${serializeAttrs(attrs)}>`
  } else {
    return `<${tag}${serializeAttrs(attrs)}>${serializeTags(
      children,
      incrementIndent(indent),
    )}</${tag}>`
  }
}

function serializeTags(
  tags: HtmlTagDescriptor['children'],
  indent: string = '',
): string {
  if (typeof tags === 'string') {
    return tags
  } else if (tags && tags.length) {
    return tags.map((tag) => `${indent}${serializeTag(tag, indent)}\n`).join('')
  }
  return ''
}

function serializeAttrs(attrs: HtmlTagDescriptor['attrs']): string {
  let res = ''
  for (const key in attrs) {
    if (typeof attrs[key] === 'boolean') {
      res += attrs[key] ? ` ${key}` : ``
    } else {
      res += ` ${key}="${escapeHtml(attrs[key])}"`
    }
  }
  return res
}

function incrementIndent(indent: string = '') {
  return `${indent}${indent[0] === '\t' ? '\t' : '  '}`
}

