# @vrowser/rolldown

Pre-bundled `@rolldown/browser` for easy browser usage. All dependencies (`@napi-rs/wasm-runtime`, `memfs`, etc.) are pre-resolved, so you can use rolldown in the browser with a simple `import`.

## 🤔 Why?

`@rolldown/browser` cannot be used with a simple `import` in the browser because:

- `rolldown-binding.wasi-browser.js` imports `@napi-rs/wasm-runtime` via bare specifiers (not resolvable in browsers)
- Worker scripts also use bare specifier imports
- WASM binary URL is resolved via `import.meta.url` relative paths
- `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers

This package pre-bundles everything so that bare specifiers are resolved and all files are co-located.

## 🚀 Usage

```ts
import { rolldown } from '@vrowser/rolldown'
import { memfs } from '@vrowser/rolldown/experimental'

// Write files to virtual filesystem
memfs.volume.fromJSON({
  '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
  '/src/math.js': 'export function add(a, b) { return a + b }'
})

// Bundle
const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
const { output } = await bundle.generate({ format: 'esm' })
console.log(output[0].code)
```

## Exports

### `@vrowser/rolldown`

Re-exports from `@rolldown/browser`:

- `rolldown` - Main bundler function
- `VERSION` - Rolldown version string

### `@vrowser/rolldown/experimental`

Re-exports from `@rolldown/browser/experimental`:

- `memfs` - In-memory filesystem (`{ fs, volume }`) used by the WASM runtime
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

```bash
pnpm build
```

This produces:

| File                                     | Description                                 |
| ---------------------------------------- | ------------------------------------------- |
| `dist/index.js`                          | Main entry (rolldown API)                   |
| `dist/experimental.js`                   | Experimental entry (memfs, parseSync, etc.) |
| `dist/chunks/`                           | Shared chunks (binding, wasm-runtime)       |
| `dist/worker.js`                         | Bundled WASI worker script                  |
| `dist/rolldown-binding.wasm32-wasi.wasm` | WASM binary (~11MB)                         |

`index.js` and `experimental.js` share the same binding instance via code splitting, ensuring that files written via `memfs` are visible to `rolldown()`.

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
