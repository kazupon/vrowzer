/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { Program } from '@oxc-project/types'

export * from '@oxc-project/types'

export interface ParserOptions {
  lang?: string
  sourceType?: string
  astType?: string
  range?: boolean
  preserveParens?: boolean
  showSemanticErrors?: boolean
}

export interface Comment {
  type: 'Line' | 'Block'
  value: string
  start: number
  end: number
}

export interface ErrorLabel {
  message?: string
  start: number
  end: number
}

export interface OxcError {
  severity: 'Error' | 'Warning' | 'Advice'
  message: string
  labels: ErrorLabel[]
  helpMessage?: string
}

export interface Span {
  start: number
  end: number
}

export interface ValueSpan {
  value: string
  start: number
  end: number
}

export type ImportNameKind = 'Name' | 'NamespaceObject' | 'Default'

export interface ImportName {
  kind: ImportNameKind
  name?: string
  start?: number
  end?: number
}

export interface StaticImportEntry {
  importName: ImportName
  localName: ValueSpan
  isType: boolean
}

export interface StaticImport {
  start: number
  end: number
  moduleRequest: ValueSpan
  entries: StaticImportEntry[]
}

export type ExportImportNameKind = 'Name' | 'All' | 'AllButDefault' | 'None'

export interface ExportImportName {
  kind: ExportImportNameKind
  name?: string
  start?: number
  end?: number
}

export type ExportExportNameKind = 'Name' | 'Default' | 'None'

export interface ExportExportName {
  kind: ExportExportNameKind
  name?: string
  start?: number
  end?: number
}

export type ExportLocalNameKind = 'Name' | 'Default' | 'None'

export interface ExportLocalName {
  kind: ExportLocalNameKind
  name?: string
  start?: number
  end?: number
}

export interface StaticExportEntry {
  start: number
  end: number
  moduleRequest?: ValueSpan
  importName: ExportImportName
  exportName: ExportExportName
  localName: ExportLocalName
  isType: boolean
}

export interface StaticExport {
  start: number
  end: number
  entries: StaticExportEntry[]
}

export interface DynamicImport {
  start: number
  end: number
  moduleRequest: Span
}

export interface EcmaScriptModule {
  hasModuleSyntax: boolean
  staticImports: StaticImport[]
  staticExports: StaticExport[]
  dynamicImports: DynamicImport[]
  importMetas: Span[]
}

/**
 * Raw result from the WASM binding (all fields are JSON strings)
 */
export interface WasmParseResult {
  readonly program: string
  readonly module: string
  readonly comments: string
  readonly errors: string
}

/**
 * Public API ParseResult (napi-compatible, all fields are JS objects)
 */
export interface ParseResult {
  readonly program: Program
  readonly module: EcmaScriptModule
  readonly comments: Comment[]
  readonly errors: OxcError[]
}
