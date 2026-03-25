# @vrowzer/rolldown

Pre-bundled `@rolldown/browser` for easy browser usage. All dependencies (`@napi-rs/wasm-runtime`, `memfs`, etc.) are pre-resolved, and the internal `memfs` is replaced with `@vrowzer/fs` for filesystem instance sharing.

## 🤔 Why?

`@rolldown/browser` cannot be used with a simple `import` in the browser because:

- `rolldown-binding.wasi-browser.js` imports `@napi-rs/wasm-runtime` via bare specifiers (not resolvable in browsers)
- Worker scripts also use bare specifier imports
- WASM binary URL is resolved via `import.meta.url` relative paths
- `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers

This package pre-bundles everything so that bare specifiers are resolved and all files are co-located.

## 🚀 Usage

Two build types are provided:

### Shared build: `@vrowzer/fs` external (for Web Worker / shared filesystem)

`@vrowzer/fs` is **not** bundled. The consumer provides `@vrowzer/fs`, allowing rolldown and other code to share the same memfs Volume instance.

```ts
import { rolldown } from '@vrowzer/rolldown'
import { memfs } from '@vrowzer/rolldown/experimental'

memfs.volume.fromJSON({
  '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
  '/src/math.js': 'export function add(a, b) { return a + b }'
})

const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
const { output } = await bundle.generate({ format: 'esm' })
console.log(output[0].code)
```

### Standalone build: Fully self-contained (for browser)

`@vrowzer/fs` is bundled. No additional dependencies needed.

```ts
import { rolldown } from '@vrowzer/rolldown/browser'
import { memfs } from '@vrowzer/rolldown/browser/experimental'

memfs.volume.fromJSON({
  '/src/index.js': 'export const x = 1'
})

const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
const { output } = await bundle.generate({ format: 'esm' })
```

## Exports

### `@vrowzer/rolldown` / `@vrowzer/rolldown/browser`

Re-exports from `@rolldown/browser`:

- `rolldown` - Main bundler function
- `VERSION` - Rolldown version string

### `@vrowzer/rolldown/experimental` / `@vrowzer/rolldown/browser/experimental`

Re-exports from `@rolldown/browser/experimental`:

- `memfs` - In-memory filesystem (`{ fs, volume }`) backed by `@vrowzer/fs`
- `parseSync` / `parse` - OXC-based JavaScript/TypeScript parser
- `transform` / `transformSync` - Code transformation

### `@vrowzer/rolldown/utils` / `@vrowzer/rolldown/browser/utils`

Re-exports from `@rolldown/browser/experimental`, compatible with `rolldown/utils`:

- `transform` / `transformSync` - Code transformation (TypeScript strip, define replacement)
- `parse` / `parseSync` - OXC-based JavaScript/TypeScript parser
- `minify` / `minifySync` - OXC-based code minification
- `TsconfigCache` - TypeScript config resolution cache
- `TransformOptions` / `TransformResult` / `ParseResult` / `ParserOptions` / `MinifyOptions` / `MinifyResult` - TypeScript types

## HTTP Headers

`SharedArrayBuffer` is required by the rolldown WASM runtime. The following HTTP headers must be set on the server:

```sh
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Build

The package is built using rolldown itself:

```sh
pnpm build
```

This produces:

```sh
dist/
├── index.js                          # Shared build: main entry (@vrowzer/fs external)
├── experimental.js                   # Shared build: experimental (@vrowzer/fs external)
├── utils.js                          # Shared build: utils (transformSync)
├── chunks/                           # Shared build: shared chunks
├── worker.js                         # Shared: bundled WASI worker script
├── rolldown-binding.wasm32-wasi.wasm # Shared: WASM binary (~11MB)
└── browser/
    ├── index.js                      # Standalone build: main entry (@vrowzer/fs bundled)
    ├── experimental.js               # Standalone build: experimental (@vrowzer/fs bundled)
    ├── utils.js                      # Standalone build: utils (transformSync)
    └── chunks/                       # Standalone build: shared chunks
```

Both builds share the same `worker.js` and WASM binary. Within each variant, `index.js` and `experimental.js` share the same binding instance via code splitting, ensuring that files written via `memfs` are visible to `rolldown()`.

### Key build transformations

- `@napi-rs/wasm-runtime/fs` internal `memfs` is replaced with `@vrowzer/fs`
- `process.cwd()` is replaced with `"/"`
- fs-proxy IPC buffer is expanded from ~10KB to ~10MB
- Worker and WASM URLs are adjusted for the `chunks/` subdirectory layout

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
