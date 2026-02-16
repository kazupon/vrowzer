/**
 * oxc-parser: A JavaScript/TypeScript parser powered by wasm-bindgen
 *
 * NOTE:
 * This package is provided separately from the official oxc-parser for the following reasons:
 * - The official oxc-parser uses napi-rs with SharedArrayBuffer to support multi-threading (Web Workers)
 * - This requires COEP/COOP security headers, which restricts usage in browser environments
 *
 * @module default
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import initWasm, { parseSyncInternal } from '../pkg/vrowser_oxc_parser.js'
import { wrap } from './wrap.ts'

import type { ParseResult, ParserOptions, WasmParseResult } from './types.ts'

let wasmInitialized = false
let wasmInitPromise: Promise<void> | null = null

async function ensureInit(): Promise<void> {
  if (wasmInitialized) {
    return
  }
  if (wasmInitPromise) {
    return wasmInitPromise
  }
  wasmInitPromise = initWasm().then(() => {
    wasmInitialized = true
  })
  return wasmInitPromise
}

/**
 * Synchronous parse (napi-compatible).
 * All returned properties (program, module, comments, errors) are JS objects.
 *
 * Note: WASM must be initialized first by calling `parse()` or `await init()`.
 */
export function parseSync(
  filename: string,
  sourceText: string,
  options?: ParserOptions
): ParseResult {
  if (!wasmInitialized) {
    throw new Error(
      'WASM module not initialized. Call parse() first or await init() before using parseSync().'
    )
  }
  const raw = parseSyncInternal(filename, sourceText, options ?? {}) as WasmParseResult
  return wrap(raw)
}

/**
 * Asynchronous parse (napi-compatible).
 * Automatically initializes the WASM module on first call.
 */
export async function parse(
  filename: string,
  sourceText: string,
  options?: ParserOptions
): Promise<ParseResult> {
  await ensureInit()
  const raw = parseSyncInternal(filename, sourceText, options ?? {}) as WasmParseResult
  return wrap(raw)
}

/**
 * Explicit WASM initialization.
 * Can be called during Service Worker startup for pre-initialization.
 */
export { ensureInit as init }

export type {
  Comment,
  DynamicImport,
  EcmaScriptModule,
  ErrorLabel,
  ExportExportName,
  ExportExportNameKind,
  ExportImportName,
  ExportImportNameKind,
  ExportLocalName,
  ExportLocalNameKind,
  ImportName,
  ImportNameKind,
  OxcError,
  ParseResult,
  ParserOptions,
  Program,
  Span,
  StaticExport,
  StaticExportEntry,
  StaticImport,
  StaticImportEntry,
  ValueSpan
} from './types.ts'
