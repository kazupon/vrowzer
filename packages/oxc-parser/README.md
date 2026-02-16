# @vrowser/oxc-parser

A JavaScript/TypeScript parser powered by [oxc](https://oxc.rs/) via wasm-bindgen, designed for browser and Service Worker environments.

## ✨ Features

- Full compatibility with the official [oxc-parser](https://www.npmjs.com/package/oxc-parser) API (`parseSync` / `parse`)
- Pure WASM - no SharedArrayBuffer or COEP/COOP headers required
- Runs in Service Workers, Web Workers, and browsers
- ESTree-compatible AST output with BigInt/RegExp value restoration
- Module analysis (static imports/exports, dynamic imports, import.meta)
- Lazy deserialization via getters for optimal performance
- TypeScript support with full type definitions from `@oxc-project/types`

## 🤔 Why not the official oxc-parser?

The official `oxc-parser` uses napi-rs with SharedArrayBuffer for multi-threading support. This requires `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers, which restricts usage in many browser environments. This package uses wasm-bindgen instead, producing a pure WASM binary that works without these restrictions.

ref: https://github.com/oxc-project/oxc/issues/17165

## 🚀 Usage

### Sync Parse

```ts
import { init, parseSync } from '@vrowser/oxc-parser'

// WASM must be initialized first
await init()

const result = parseSync('app.tsx', 'const x: number = 1;')
console.log(result.program.body[0].type) // 'VariableDeclaration'
```

### Parser Options

```ts
const result = await parse('file.txt', sourceCode, {
  lang: 'tsx', // 'js' | 'jsx' | 'ts' | 'tsx' | 'dts'
  sourceType: 'module', // 'script' | 'module' | 'commonjs' | 'unambiguous'
  astType: 'ts', // 'js' | 'ts'
  range: false, // include [start, end] range arrays
  preserveParens: true, // emit ParenthesizedExpression nodes
  showSemanticErrors: false // run semantic analysis for additional errors
})
```

### Module Analysis

```ts
const result = await parse(
  'app.js',
  `
  import { foo } from 'bar'
  export const x = 1
  const m = import('baz')
`
)

console.log(result.module.hasModuleSyntax) // true
console.log(result.module.staticImports) // [{ moduleRequest: { value: 'bar', ... }, ... }]
console.log(result.module.staticExports) // [{ ... }]
console.log(result.module.dynamicImports) // [{ moduleRequest: { start, end }, ... }]
```

## API

### Functions

| Function                                    | Description                                                   |
| ------------------------------------------- | ------------------------------------------------------------- |
| `parse(filename, sourceText, options?)`     | Async parse. Auto-initializes WASM on first call              |
| `parseSync(filename, sourceText, options?)` | Sync parse. Requires `init()` or `parse()` to be called first |
| `init()`                                    | Explicitly initialize the WASM module                         |

### ParseResult

| Property   | Type               | Description            |
| ---------- | ------------------ | ---------------------- |
| `program`  | `Program`          | ESTree-compatible AST  |
| `module`   | `EcmaScriptModule` | Import/export analysis |
| `comments` | `Comment[]`        | Source comments        |
| `errors`   | `OxcError[]`       | Parse errors           |

All properties are lazy getters - JSON deserialization only occurs on first access.

## Building from Source

### Prerequisites

```sh
# Rust toolchain
rustup target add wasm32-unknown-unknown
```

### Build

```sh
pnpm build
```

This runs `wasm-pack build` (Rust to WASM) followed by `tsdown` (JS wrapper bundling + WASM copy to dist).

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
