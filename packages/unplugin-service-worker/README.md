# @vrowser/unplugin-service-worker

unplugin for `@vrowser/service-worker`

## ✨ Features

- **Automatic bundling** - Detects `createSvcWorkerController()` calls and automatically bundles Service Workers
- **Explicit entry** - Supports `entry` option for library-provided Service Worker files (e.g. from `node_modules`)
- **Multi-bundler support** - Works with Vite, Rollup, Rolldown, esbuild, Webpack, Rspack, Farm, and Bun
- **Zero-config** - Works out of the box with sensible defaults
- **Dev mode support** - Hot reload support in Vite development mode
- **Content hashing** - Generates hashed filenames for cache busting
- **ESM format** - Supports ES Module Service Workers (Chrome 91+) via `format: 'esm'`

## 💿 Installation

```sh
# npm
npm install -D @vrowser/unplugin-service-worker

# pnpm
pnpm add -D @vrowser/unplugin-service-worker

# yarn
yarn add -D @vrowser/unplugin-service-worker

# bun
bun add -D @vrowser/unplugin-service-worker
```

<!-- eslint-disable markdown/no-missing-label-refs -->

> [!NOTE]
> This plugin requires `@vrowser/service-worker` to be installed in your project.

<!-- eslint-enable markdown/no-missing-label-refs -->

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'

export default defineConfig({
  plugins: [ServiceWorker()]
})
```

<br></details>

<details>
<summary>Rolldown / tsdown</summary><br>

```ts
// rolldown.config.ts / tsdown.config.ts
import ServiceWorker from '@vrowser/unplugin-service-worker/rolldown'

export default {
  plugins: [ServiceWorker()]
}
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import ServiceWorker from '@vrowser/unplugin-service-worker/rollup'

export default {
  plugins: [ServiceWorker()]
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
import { build } from 'esbuild'
import ServiceWorker from '@vrowser/unplugin-service-worker/esbuild'

build({
  plugins: [ServiceWorker()]
})
```

<br></details>

<details>
<summary>Webpack</summary><br>

```js
// webpack.config.js
import ServiceWorker from '@vrowser/unplugin-service-worker/webpack'

export default {
  /* ... */
  plugins: [ServiceWorker()]
}
```

<br></details>

<details>
<summary>Rspack</summary><br>

```ts
// rspack.config.js
import ServiceWorker from '@vrowser/unplugin-service-worker/rspack'

export default {
  /* ... */
  plugins: [ServiceWorker()]
}
```

<br></details>

<details>
<summary>Farm</summary><br>

```ts
// farm.config.ts
import ServiceWorker from '@vrowser/unplugin-service-worker/farm'

export default {
  plugins: [ServiceWorker()]
}
```

<br></details>

<details>
<summary>Bun</summary><br>

```ts
import ServiceWorker from '@vrowser/unplugin-service-worker/bun'

Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  plugins: [ServiceWorker()]
})
```

<br></details>

## 📖 Details of Features

### Automatic Service Worker Bundling

The plugin detects `createSvcWorkerController()` calls with `new URL()` pattern and automatically bundles the referenced Service Worker file.

```ts
// src/main.ts
import { createSvcWorkerController } from '@vrowser/service-worker/controller'

// The plugin detects this pattern and bundles './sw.ts' as a separate entry
const controller = createSvcWorkerController({
  scriptURL: new URL('./sw.ts', import.meta.url)
})
```

**How it works:**

1. Scans source files for `createSvcWorkerController({ scriptURL: new URL(...) })` pattern
2. Resolves the Service Worker file path (supports `.js`, `.ts`, etc.)
3. Bundles the Service Worker as a separate output file
4. Replaces the URL reference with the correct output path

**Before (source):**

```ts
createSvcWorkerController({ scriptURL: new URL('./sw.ts', import.meta.url) })
```

**After (bundled):**

```ts
createSvcWorkerController({ scriptURL: new URL('/assets/sw-a1b2c3d4.js', import.meta.url) })
```

### Explicit Entry

When the Service Worker entry file is provided by a library (e.g. in `node_modules`), the automatic detection via `createSvcWorkerController()` won't work because `node_modules` is excluded from scanning by default. The `entry` option solves this by explicitly specifying the Service Worker file path.

```ts
ServiceWorker({
  entry: './node_modules/vrowser/dist/service-worker.ts'
})
```

When `entry` is specified, the plugin:

1. Bundles the entry file as a Service Worker
2. Scans all files (including `node_modules`) for `new URL()` references to the entry file
3. Rewrites those references to point to the bundled output

This works correctly with pnpm workspace symlinks — the plugin resolves symlinks when comparing paths.

### Dev Mode Support (Vite)

In Vite development mode, Service Workers are bundled on-demand:

- **On-demand bundling** - Service Worker is bundled when the browser requests it
- **Inline source maps** - Easier debugging in browser DevTools
- **No caching** - Immediate updates when you modify the Service Worker

```ts
// Development: URL includes query parameter for dev server handling
new URL('./sw.ts?__sw=1', import.meta.url)

// Production: URL points to bundled file with content hash
new URL('/assets/sw-a1b2c3d4.js', import.meta.url)
```

### Content Hashing

Production builds include content-based hashes in filenames:

```sh
dist/
├── assets/
│   ├── main-x9y8z7w6.js
│   └── sw-a1b2c3d4.js    # Hash changes when Service Worker content changes
└── index.html
```

- Enables long-term browser caching
- Automatic cache busting when Service Worker content changes
- Hash is generated from the bundled output content

### Scope-based Output Path

When you specify a `scope` parameter in `createSvcWorkerController()`, the plugin automatically places the bundled Service Worker in the corresponding directory. This allows the Service Worker to be registered with the intended scope without requiring a `Service-Worker-Allowed` header.

```ts
// src/main.ts
import { createSvcWorkerController } from '@vrowser/service-worker/controller'

const controller = createSvcWorkerController({
  scriptURL: new URL('./sw.ts', import.meta.url),
  scope: '/' // Service Worker will be placed at root
})
```

**Output path based on scope:**

| `scope` value | Output path                     |
| ------------- | ------------------------------- |
| `'/'`         | `sw-[hash].js` (root)           |
| `'/app/'`     | `app/sw-[hash].js`              |
| `'/api/v1/'`  | `api/v1/sw-[hash].js`           |
| Not specified | `assets/sw-[hash].js` (default) |

**Example directory structure:**

```sh
# With scope: '/'
dist/
├── sw-a1b2c3d4.js     # At root, default scope is '/'
├── assets/
│   └── main-x9y8z7w6.js
└── index.html

# Without scope (default behavior)
dist/
├── assets/
│   ├── main-x9y8z7w6.js
│   └── sw-a1b2c3d4.js  # In assets/, default scope is '/assets/'
└── index.html
```

<!-- eslint-disable markdown/no-missing-label-refs -->

> [!NOTE]
> The default scope of a Service Worker is determined by its script location. By placing the script at root, you can register it with `scope: '/'` without needing the `Service-Worker-Allowed` HTTP header.

<!-- eslint-enable markdown/no-missing-label-refs -->

### WASM Support

The plugin automatically handles `new URL("*.wasm", import.meta.url)` patterns in Service Worker code. The behavior depends on the build mode and configuration:

| Mode        | `assets` option | Behavior                                                              |
| ----------- | --------------- | --------------------------------------------------------------------- |
| Development | Any             | WASM is always inlined as base64 data URL                             |
| Production  | Not specified   | WASM is inlined as base64 data URL                                    |
| Production  | Specified       | WASM is served as a separate file alongside the Service Worker bundle |

#### Default: WASM Inline (no configuration needed)

By default, WASM binaries are inlined as base64 data URLs (`data:application/wasm;base64,...`). This works automatically with no configuration in both dev and production modes.

```ts
// Before bundling (in your Service Worker code or dependencies)
const wasmUrl = new URL('parser.wasm', import.meta.url)
const module = await WebAssembly.instantiateStreaming(fetch(wasmUrl))

// After bundling (automatic transformation)
const wasmUrl = 'data:application/wasm;base64,AGFzbQ...'
const module = await WebAssembly.instantiateStreaming(fetch(wasmUrl))
```

Inlining is necessary because:

- Service Workers are bundled as IIFE format where `import.meta.url` is not available
- The Service Worker's `fetch` handler would intercept WASM fetch requests, causing infinite loops

#### Separate WASM files with `assets` option (production only)

For production builds, you can serve WASM files as separate assets instead of inlining them by specifying the [`assets`](#assets) option. This reduces bundle size and enables streaming compilation.

```ts
ServiceWorker({
  assets: [{ src: './node_modules/some-pkg/parser.wasm' }]
})
```

When `assets` is specified, the plugin automatically:

1. Adds `wasmUrlPlugin()` to the Service Worker bundler, which replaces `new URL("*.wasm", import.meta.url)` with `new URL("*.wasm", self.location.href)` in the production bundle
2. Copies the WASM files to the same output directory as the Service Worker bundle

You can also add `wasmUrlPlugin()` to the `plugins` option manually if you need more control:

```ts
import ServiceWorker, { wasmUrlPlugin } from '@vrowser/unplugin-service-worker/vite'

ServiceWorker({
  plugins: [wasmUrlPlugin()],
  assets: [{ src: './node_modules/some-pkg/parser.wasm' }]
})
```

<!-- eslint-disable markdown/no-missing-label-refs -->

> [!NOTE]
> In development mode, WASM is always inlined regardless of the `assets` or `plugins` option, because the dev server cannot serve additional asset files alongside the Service Worker.

> [!NOTE]
> `wasmUrlPlugin()` is a rolldown plugin for the Service Worker bundler. It works with all bundlers that use rolldown internally (Vite, Rolldown, Rollup, esbuild, Farm, Bun), but **does not work with webpack or rspack** as they use their own child compiler for Service Worker bundling.

<!-- eslint-enable markdown/no-missing-label-refs -->

## ⚙️ Options

```ts
ServiceWorker({
  // Explicit Service Worker entry file path
  // Default: undefined
  entry: './node_modules/vrowser/dist/service-worker.ts',

  // Files to include for Service Worker processing
  // Default: [/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/]
  include: [/\.tsx?$/],

  // Files to exclude from Service Worker processing
  // Default: [/node_modules/]
  exclude: [/node_modules/, /\.test\.ts$/],

  // Plugin enforcement phase
  // Default: 'pre'
  enforce: 'pre',

  // Set Service-Worker-Allowed header in Vite dev server
  // Default: undefined
  serviceWorkerAllowed: '/',

  // Output format for the Service Worker bundle
  // Default: 'iife'
  format: 'esm',

  // Additional rolldown plugins for the Service Worker bundler
  // Default: undefined
  plugins: [myRolldownPlugin()],

  // Additional assets to emit alongside the Service Worker bundle
  // Default: undefined
  assets: [
    { src: './node_modules/some-pkg/file.wasm' },
    { src: './static/data.bin', fileName: 'data.bin' }
  ]
})
```

| Option                 | Type                                      | Default                                      | Description                                                                                                                                                                     |
| ---------------------- | ----------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entry`                | `string \| undefined`                     | `undefined`                                  | Explicit Service Worker entry file path. When specified, bundles this file without scanning for `createSvcWorkerController()`. See [Explicit Entry](#explicit-entry).           |
| `include`              | `FilterPattern`                           | `[/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/]` | Files to include for processing                                                                                                                                                 |
| `exclude`              | `FilterPattern`                           | `[/node_modules/]`                           | Files to exclude from processing                                                                                                                                                |
| `enforce`              | `'pre' \| 'post' \| undefined`            | `'pre'`                                      | Plugin enforcement phase                                                                                                                                                        |
| `serviceWorkerAllowed` | `string \| undefined`                     | `undefined`                                  | Set `Service-Worker-Allowed` header in Vite dev server. Allows registering a Service Worker with a scope broader than the script location. Only takes effect during `vite dev`. |
| `format`               | `'iife' \| 'esm' \| undefined`            | `'iife'`                                     | Output format. `'esm'` preserves `import.meta.url` and dynamic `import()`, required when the SW uses top-level await or WASM imports. Requires Chrome 91+.                      |
| `plugins`              | `Plugin[] \| undefined`                   | `undefined`                                  | Additional rolldown plugins for the Service Worker bundler. Merged with plugins from the parent bundler.                                                                        |
| `assets`               | `ServiceWorkerAssetConfig[] \| undefined` | `undefined`                                  | Additional assets to emit alongside the Service Worker bundle. See [Assets](#assets) below.                                                                                     |

### Assets

The `assets` option allows you to emit additional files alongside the bundled Service Worker. This is useful for production builds where binary files (e.g. WASM) need to be served from the same location as the Service Worker script.

```ts
ServiceWorker({
  assets: [
    // Emit WASM file next to the Service Worker bundle
    { src: './node_modules/@vrowser/oxc-parser/dist/vrowser_oxc_parser_bg.wasm' },
    // Emit with a custom filename
    { src: './static/model.bin', fileName: 'model.bin' }
  ]
})
```

**`ServiceWorkerAssetConfig`:**

| Field      | Type                  | Description                                             |
| ---------- | --------------------- | ------------------------------------------------------- |
| `src`      | `string`              | Source file path (absolute or relative to project root) |
| `fileName` | `string \| undefined` | Output filename. Defaults to the basename of `src`      |

The emitted assets are placed in the same output directory as the Service Worker bundle, following the [scope-based output path](#scope-based-output-path) rules.

When `assets` is specified, the production build behavior changes for WASM files:

- WASM files are **not** inlined as base64 data URLs
- Instead, `new URL("*.wasm", import.meta.url)` is rewritten to `new URL("*.wasm", self.location.href)`, and the WASM files are copied alongside the Service Worker bundle

See [WASM Support](#wasm-support) for details on how dev and production modes handle WASM files.

### Plugin Support in Service Worker Bundling

The Service Worker bundler can use plugins from the parent bundler:

| Parent Bundler | Plugin Forwarding | Notes                                            |
| -------------- | ----------------- | ------------------------------------------------ |
| Vite           | Automatic         | Plugins adapted via environment injection        |
| Rolldown       | Automatic         | Plugins forwarded directly (filtered)            |
| Rollup         | Automatic         | Plugins forwarded directly (filtered)            |
| webpack        | Automatic         | Child compiler inherits parent plugins           |
| rspack         | Automatic         | Child compiler inherits parent plugins           |
| esbuild        | Manual            | Use `plugins` option to provide rolldown plugins |
| Farm           | Manual            | Use `plugins` option to provide rolldown plugins |

For esbuild and Farm, the parent bundler's plugin API is incompatible with
rolldown. Use the `plugins` option to provide rolldown-compatible plugins:

```ts
ServiceWorker({
  plugins: [myRolldownPlugin()]
})
```

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
