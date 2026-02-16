/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type {
  Comment,
  EcmaScriptModule,
  OxcError,
  ParseResult,
  Program,
  WasmParseResult
} from './types.ts'

/**
 * All fields from the Rust (wasm-bindgen) ParseResult are JSON strings.
 * This converts them to JS objects with lazy getters, matching the napi version behavior.
 */
export function wrap(result: WasmParseResult): ParseResult {
  let program: Program | undefined
  let module_: EcmaScriptModule | undefined
  let comments: Comment[] | undefined
  let errors: OxcError[] | undefined

  return {
    get program() {
      if (!program) {
        program = jsonParseAst(result.program)
      }
      return program
    },
    get module() {
      if (!module_) {
        module_ = JSON.parse(result.module) as EcmaScriptModule
      }
      return module_
    },
    get comments() {
      if (!comments) {
        comments = JSON.parse(result.comments) as Comment[]
      }
      return comments
    },
    get errors() {
      if (!errors) {
        errors = JSON.parse(result.errors) as OxcError[]
      }
      return errors
    }
  }
}

/**
 * Parse ESTree JSON (fixes format) and restore BigInt/RegExp values.
 * Same logic as `jsonParseAst` in the napi version's wrap.js.
 */
export function jsonParseAst(programJson: string): Program {
  const { node: program, fixes } = JSON.parse(programJson) as {
    node: Program
    fixes: (string | number)[][]
  }
  for (const fixPath of fixes) {
    applyFix(program, fixPath)
  }
  return program
}

function applyFix(program: Program, fixPath: (string | number)[]): void {
  let node = program
  for (const key of fixPath) {
    // @ts-ignore -- generaion codes
    node = node[key]
  }

  // @ts-ignore -- generaion codes
  if (node.bigint) {
    // @ts-ignore -- generaion codes
    node.value = BigInt(node.bigint)
  } else {
    try {
      // @ts-ignore -- generaion codes
      node.value = RegExp(node.regex.pattern, node.regex.flags)
    } catch {
      // Invalid regexp, or valid regexp using syntax not supported by this JS engine
    }
  }
}
