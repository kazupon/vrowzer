# @vrowser/rolldown

Pre-bundled `@rolldown/browser` for easy browser usage. All dependencies (`@napi-rs/wasm-runtime`, `memfs`, etc.) are pre-resolved, and the internal `memfs` is replaced with `@vrowser/fs` for filesystem instance sharing.

## 🤔 Why?

`@rolldown/browser` cannot be used with a simple `import` in the browser because:

- `rolldown-binding.wasi-browser.js` imports `@napi-rs/wasm-runtime` via bare specifiers (not resolvable in browsers)
- Worker scripts also use bare specifier imports
- WASM binary URL is resolved via `import.meta.url` relative paths
- `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers

This package pre-bundles everything so that bare specifiers are resolved and all files are co-located.

## 🚀 Usage

Two build types are provided:

### Shared build: `@vrowser/fs` external (for Web Worker / shared filesystem)

`@vrowser/fs` is **not** bundled. The consumer provides `@vrowser/fs`, allowing rolldown and other code to share the same memfs Volume instance.

```ts
import { rolldown } from '@vrowser/rolldown'
import { memfs } from '@vrowser/rolldown/experimental'

memfs.volume.fromJSON({
  '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
  '/src/math.js': 'export function add(a, b) { return a + b }'
})

const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
const { output } = await bundle.generate({ format: 'esm' })
console.log(output[0].code)
```

### Standalone build: Fully self-contained (for browser)

`@vrowser/fs` is bundled. No additional dependencies needed.

```ts
import { rolldown } from '@vrowser/rolldown/browser'
import { memfs } from '@vrowser/rolldown/browser/experimental'

memfs.volume.fromJSON({
  '/src/index.js': 'export const x = 1'
})

const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
const { output } = await bundle.generate({ format: 'esm' })
```

## Exports

### `@vrowser/rolldown` / `@vrowser/rolldown/browser`

Re-exports from `@rolldown/browser`:

- `rolldown` - Main bundler function
- `VERSION` - Rolldown version string

### `@vrowser/rolldown/experimental` / `@vrowser/rolldown/browser/experimental`

Re-exports from `@rolldown/browser/experimental`:

- `memfs` - In-memory filesystem (`{ fs, volume }`) backed by `@vrowser/fs`
- `parseSync` / `parse` - OXC-based JavaScript/TypeScript parser
- `transform` / `transformSync` - Code transformation

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
├── index.js                          # Shared build: main entry (@vrowser/fs external)
├── experimental.js                   # Shared build: experimental (@vrowser/fs external)
├── chunks/                           # Shared build: shared chunks
├── worker.js                         # Shared: bundled WASI worker script
├── rolldown-binding.wasm32-wasi.wasm # Shared: WASM binary (~11MB)
└── browser/
    ├── index.js                      # Standalone build: main entry (@vrowser/fs bundled)
    ├── experimental.js               # Standalone build: experimental (@vrowser/fs bundled)
    └── chunks/                       # Standalone build: shared chunks
```

Both builds share the same `worker.js` and WASM binary. Within each variant, `index.js` and `experimental.js` share the same binding instance via code splitting, ensuring that files written via `memfs` are visible to `rolldown()`.

### Key build transformations

- `@napi-rs/wasm-runtime/fs` internal `memfs` is replaced with `@vrowser/fs`
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
