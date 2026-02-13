# @vrowser/unplugin-service-worker

unplugin for `@vrowser/service-worker`

## ✨ Features

- **Automatic bundling** - Detects `createSvcWorkerController()` calls and automatically bundles Service Workers
- **Multi-bundler support** - Works with Vite, Rollup, Rolldown, esbuild, Webpack, Rspack, Farm, and Bun
- **Zero-config** - Works out of the box with sensible defaults
- **Dev mode support** - Hot reload support in Vite development mode
- **Content hashing** - Generates hashed filenames for cache busting

## 💿 Installation

```sh
# npm
npm install -D @vrowser/unplugin-service-worker

# pnpm
pnpm add -D @vrowser/unplugin-service-worker

# yarn
yarn add -D @vrowser/unpluign-service-worker

# bun
bun add -D @vrowser/unplugin-service-worker
```

> **Note**: This plugin requires `@vrowser/service-worker` to be installed in your project.

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
const controller = createSvcWorkerController(new URL('./sw.ts', import.meta.url))
```

**How it works:**

1. Scans source files for `createSvcWorkerController(new URL(...))` pattern
2. Resolves the Service Worker file path (supports `.js`, `.ts`, etc.)
3. Bundles the Service Worker as a separate output file
4. Replaces the URL reference with the correct output path

**Before (source):**

```ts
createSvcWorkerController(new URL('./sw.ts', import.meta.url))
```

**After (bundled):**

```ts
createSvcWorkerController(new URL('/assets/sw-a1b2c3d4.js', import.meta.url))
```

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
│   └── sw-a1b2c3d4.js    # Hash changes when SW content changes
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

> **Note**: The default scope of a Service Worker is determined by its script location. By placing the script at root, you can register it with `scope: '/'` without needing the `Service-Worker-Allowed` HTTP header.

## ⚙️ Options

```ts
ServiceWorker({
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

  // Additional rolldown plugins for the Service Worker bundler
  // Default: undefined
  plugins: [myRolldownPlugin()]
})
```

| Option                 | Type                           | Default                                      | Description                                                                                                                                                                     |
| ---------------------- | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include`              | `FilterPattern`                | `[/\.[cm]?[jt]sx?$/, /\.vue$/, /\.svelte$/]` | Files to include for processing                                                                                                                                                 |
| `exclude`              | `FilterPattern`                | `[/node_modules/]`                           | Files to exclude from processing                                                                                                                                                |
| `enforce`              | `'pre' \| 'post' \| undefined` | `'pre'`                                      | Plugin enforcement phase                                                                                                                                                        |
| `serviceWorkerAllowed` | `string \| undefined`          | `undefined`                                  | Set `Service-Worker-Allowed` header in Vite dev server. Allows registering a Service Worker with a scope broader than the script location. Only takes effect during `vite dev`. |
| `plugins`              | `Plugin[] \| undefined`        | `undefined`                                  | Additional rolldown plugins for the Service Worker bundler. Merged with plugins from the parent bundler.                                                                        |

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
