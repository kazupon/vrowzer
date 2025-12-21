/**
 * Dynamic import helper to avoid Vite's static analysis
 */
function dynamicImport<T = unknown>(url: string): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- NOTE: Dynamic import
  return new Function('url', 'return import(url)')(url) as Promise<T>
}

export async function loadParser(): Promise<typeof import('oxc-parser')> {
  console.log('[Parser] Loading oxc-parser...')

  // https://cdn.jsdelivr.net/npm/@oxc-parser/binding-wasm32-wasi/browser-bundle.js
  const url = 'https://cdn.jsdelivr.net/npm/@oxc-parser/binding-wasm32-wasi/browser-bundle.js'
  const parser = (await import(/* @vite-ignore */ url)) as typeof import('oxc-parser')
  // const [parser] = await Promise.all([
  //   dynamicImport<typeof import('oxc-parser')>(
  //     '/api/oxc-parser/binding-wasm32-wasi/parser.wasi-browser.js'
  //     // '/api/oxc-parser/binding-wasm32-wasi/browser-bundle.js'
  //   )
  // ])

  console.log('[Parser] oxc-parser loaded:', parser)
  return parser
}

export function wrap(result) {
  let program, module, comments, errors
  return {
    get program() {
      if (!program) program = jsonParseAst(result.program)
      return program
    },
    get module() {
      if (!module) module = result.module
      return module
    },
    get comments() {
      if (!comments) comments = result.comments
      return comments
    },
    get errors() {
      if (!errors) errors = result.errors
      return errors
    }
  }
}

// Used by `napi/playground/scripts/patch.js`.
//
// Set `value` field of `Literal`s which are `BigInt`s or `RegExp`s.
//
// Returned JSON contains an array `fixes` with paths to these nodes
// e.g. for `123n; foo(/xyz/)`, `fixes` will be
// `[["body", 0, "expression"], ["body", 1, "expression", "arguments", 2]]`.
//
// Walk down the AST to these nodes and alter them.
// Compiling the list of fixes on Rust side avoids having to do a full AST traversal on JS side
// to locate the likely very few `Literal`s which need fixing.
export function jsonParseAst(programJson) {
  const { node: program, fixes } = JSON.parse(programJson)
  for (const fixPath of fixes) {
    applyFix(program, fixPath)
  }
  return program
}

function applyFix(program, fixPath) {
  let node = program
  for (const key of fixPath) {
    node = node[key]
  }

  if (node.bigint) {
    node.value = BigInt(node.bigint)
  } else {
    try {
      node.value = RegExp(node.regex.pattern, node.regex.flags)
    } catch {
      // Invalid regexp, or valid regexp using syntax not supported by this version of NodeJS
    }
  }
}
