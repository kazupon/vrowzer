# @vrowzer/vite-plugin

Vite plugin for [vrowzer](https://github.com/kazupon/vrowzer) - browser-based Vite dev server preview system.

This plugin configures Vite for running `@vrowzer/vite-dev-server` in Service Worker and Web Worker environments. It handles auto manifest generation, Node.js polyfills, CORS headers, `process` global injection, WASM file copying, Worker config extraction/prebundling, Service Worker bundling, and an experimental browser IDE.

## 💿 Installation

```sh
# npm
npm install -D @vrowzer/vite-plugin

# pnpm
pnpm add -D @vrowzer/vite-plugin

# yarn
yarn add -D @vrowzer/vite-plugin
```

## 🚀 Usage

### Auto mode (default)

The plugin automatically generates a manifest from the project's `package.json` dependencies and source files. No manual manifest file or `VrowzerManifest()` plugin is needed.

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), Vrowzer()]
})
```

The auto-generated manifest is available via the `virtual:vrowzer-manifest` virtual module:

```ts
import manifest from 'virtual:vrowzer-manifest'

const vrowzer = Vrowzer()
await vrowzer.ready({
  files: { ...manifest.files, ...manifest.nodeModules }
})
```

### Preview base path

The plugin's `basePath` is the source of truth for the application, Web Worker, and Service Worker bundles. Configure it once in `vite.config.ts`; application code can call `Vrowzer()` without repeating the value.

For a host application served from a nested Vite base:

```ts
// vite.config.ts
export default defineConfig({
  base: '/app/',
  plugins: [Vrowzer({ basePath: '/app/__preview__/' })]
})
```

```ts
// application code
import { Vrowzer } from 'vrowzer'

const vrowzer = Vrowzer()
```

The runtime `Vrowzer({ basePath })` option remains compatible. When it is also specified, its canonical path must match the plugin value; a mismatch throws during `Vrowzer()` creation. The Service Worker registration `serviceWorkerScope` is independent of this preview URL path.

### Service Worker scope

The plugin's `serviceWorkerScope` is the source of truth for both Service Worker registration and the `Service-Worker-Allowed` response header. Configure it once in `vite.config.ts`; the runtime option can be omitted:

```ts
// vite.config.ts
export default defineConfig({
  base: '/app/',
  plugins: [
    Vrowzer({
      basePath: '/app/__preview__/',
      serviceWorkerScope: '/app/'
    })
  ]
})
```

```ts
// application code
import { Vrowzer } from 'vrowzer'

const vrowzer = Vrowzer()
```

The runtime `Vrowzer({ serviceWorkerScope })` option remains available for compatibility and for builds without the plugin. If both values are provided, they must match or `Vrowzer()` throws before registration. Without either value, the scope and response header default to `/`.

### Service Worker version

The plugin's `serviceWorkerVersion` is the source of truth for the version expected by the application and reported by the Service Worker. Configure it once in `vite.config.ts`; application code can call `Vrowzer()` without repeating the value:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [Vrowzer({ serviceWorkerVersion: 'app-v2' })]
})
```

```ts
// application code
import { Vrowzer } from 'vrowzer'

const vrowzer = Vrowzer()
```

The runtime `Vrowzer({ serviceWorkerVersion })` option remains available for compatibility and for builds without the plugin. If both values are provided, they must match or `Vrowzer()` throws before Service Worker registration. Without either value, the version defaults to `vrowzer-v1`. The resolved version is also reflected in the Service Worker script URL, so changing it may trigger a Service Worker update.

When the host page and preview content are in different directories, use `manifest.sourceDir`:

```ts
Vrowzer({
  manifest: {
    sourceDir: './app', // scan ./app/ for preview content
    targets: ['vue'] // only include vue (+ transitive deps)
  }
})
```

### Manual mode

For advanced use cases (e.g. multiple fixtures), disable auto mode and use `VrowzerManifest()` with a manually created `vrowzer-manifest.json`.

```ts
// vite.config.ts
import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [VrowzerManifest(), Vrowzer({ auto: false })]
})
```

### Browser IDE (experimental)

Enable the browser IDE to get a full development environment at `/__vrowzer__/` with File Explorer, Monaco Editor, and live Preview.

```ts
Vrowzer({
  manifest: {
    sourceDir: './app',
    targets: ['vue']
  },
  experimental: { ide: true }
})
```

The IDE is a pre-built Vue app bundled into the plugin (no additional dependencies required). It includes:

- **File Explorer** with vscode-icons
- **Monaco Editor** with web language support (HTML, CSS, JS, TS, Vue, etc.)
- **Live Preview** powered by vrowzer (HMR via Web Worker + Service Worker)
- **File sync** via birpc WebSocket (edits are saved to local filesystem)

On `vite dev`, the IDE URL is printed in the console:

```
  ➜  Local:   http://localhost:5173/
  ➜  Vrowzer IDE: http://localhost:5173/__vrowzer__/
```

You can also specify a custom port for the birpc WebSocket server:

```ts
Vrowzer({
  experimental: {
    ide: { port: 7900 }
  }
})
```

## ⚙️ Options

```ts
Vrowzer({
  // Enable auto manifest generation
  // Default: true
  auto: true,

  // Auto manifest options (used when auto: true)
  manifest: {
    // Directory to scan for source files (index.html, src/, public/)
    // Default: Vite project root
    sourceDir: './app',
    // Package directory for node_modules resolution
    // Default: Vite project root
    pkgDir: '.',
    // Package name(s) to include in nodeModules
    // Default: all dependencies
    targets: ['vue']
  },

  // Experimental features
  experimental: {
    // Enable browser IDE at /__vrowzer__/
    // Default: false
    ide: true // or { port: 7900 }
  },

  // Base path for the preview system
  // Default: '/__preview__/'
  basePath: '/__preview__/',

  // Service Worker registration scope and allowed response header
  // Default: '/'
  serviceWorkerScope: '/',

  // Service Worker version for cache management
  // Default: 'vrowzer-v1'
  serviceWorkerVersion: 'my-app-v1',

  // Explicit Service Worker entry file path
  // Default: Resolved path to 'vrowzer/service-worker'
  serviceWorkerEntry: 'vrowzer/service-worker',

  // Worker-specific resolve settings
  // Default: undefined
  resolve: {
    alias: [{ find: 'my-lib', replacement: '/libs/my-lib.js' }]
  }
})
```

| Option                 | Type                         | Default                                   | Description                                                                               |
| ---------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `auto`                 | `boolean`                    | `true`                                    | Enable auto manifest generation. Set `false` to use `VrowzerManifest()` manually.         |
| `manifest`             | `VrowzerManifestOptions`     | `undefined`                               | Auto manifest options (sourceDir, pkgDir, targets). Used when `auto: true`.               |
| `experimental`         | `VrowzerExperimentalOptions` | `undefined`                               | Experimental features. Currently supports `ide`.                                          |
| `basePath`             | `string`                     | `'/__preview__/'`                         | Preview URL pathname shared with the application and Service Worker bundles.              |
| `serviceWorkerScope`   | `string`                     | `'/'`                                     | Registration scope and `Service-Worker-Allowed` header injected into the runtime.          |
| `serviceWorkerVersion` | `string`                     | `'vrowzer-v1'`                            | Version shared with the application and Service Worker bundles.                           |
| `serviceWorkerEntry`   | `string`                     | Resolved path to `vrowzer/service-worker` | Explicit Service Worker entry file path.                                                  |
| `resolve`              | `{ alias?: Alias[] }`        | `undefined`                               | Worker-specific resolve settings passed to the internal Vite dev server.                  |

### `VrowzerManifestOptions`

| Option      | Type       | Default           | Description                                                             |
| ----------- | ---------- | ----------------- | ----------------------------------------------------------------------- |
| `sourceDir` | `string`   | Vite project root | Directory to scan for project source files (index.html, src/, public/). |
| `pkgDir`    | `string`   | Vite project root | Package directory for node_modules resolution.                          |
| `targets`   | `string[]` | all dependencies  | Package name(s) to include. Only these packages + transitive deps.      |

### `VrowzerExperimentalOptions`

| Option | Type                           | Default | Description                                                      |
| ------ | ------------------------------ | ------- | ---------------------------------------------------------------- |
| `ide`  | `boolean \| VrowzerIdeOptions` | `false` | Enable browser IDE at `/__vrowzer__/`. `true` uses all defaults. |

### `VrowzerIdeOptions`

| Option | Type     | Default | Description                          |
| ------ | -------- | ------- | ------------------------------------ |
| `port` | `number` | auto    | Port for the birpc WebSocket server. |

## 🔌 Exported Plugins

### `Vrowzer(options?)`

Returns an array of Vite plugins that configure the environment for vrowzer:

#### 1. Auto Manifest Generation (`vrowzer:auto-manifest`)

When `auto: true` (default), automatically generates a vrowzer manifest in `configResolved`:

- Scans project source files (index.html, src/, public/)
- Collects npm dependencies from package.json
- Auto-bundles CJS packages to ESM using Rolldown
- Caches results in `node_modules/.vrowzer-manifest/` (keyed by deps + lockfile hash)
- Provides `virtual:vrowzer-manifest` virtual module with file contents resolved

#### 2. Worker Config Extraction & Prebundling (`vrowzer:config`)

Auto-extracts user plugins from `vite.config.ts` using OXC parser, then pre-bundles them with Rolldown for the Web Worker environment. The prebundled config is written to `node_modules/.vrowzer/config.bundled.mjs`.

- Resolves `@vrowzer/*` imports from the plugin's own dependency graph
- Inlines `readFileSync()` and `createRequire()` calls for Worker compatibility
- Maps `vite` imports to `@vrowzer/vite-dev-server/vite`
- Excludes `@vrowzer/vite-dev-server` from host dependency pre-bundling while keeping `vrowzer` optimizable

#### 3. Preview Guard Middleware (`vrowzer:server-middleware`)

Prevents Vite's SPA fallback from serving `index.html` for `basePath` requests when the Service Worker is not yet active. Returns a 503 with auto-retry instead.

#### 4. Process Global Injection

Injects `process` polyfill (`@vrowzer/node-polyfill/process`) for browser/Worker environments:

- **Dev mode**: Uses `@rollup/plugin-inject`
- **Build mode**: Uses Rolldown's native `transform.inject`

#### 5. Environment Configuration (`vrowzer:env`)

Sets up Vite configuration for the browser-based Vite dev server:

- **`resolve.alias`** — Maps Node.js built-in modules (`node:fs`, `node:path`, `node:events`, etc.) to browser-compatible polyfills
- **`worker.format`** — Set to `'es'` for ES Module workers
- **CORS headers** — `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`, plus `Service-Worker-Allowed` matching `serviceWorkerScope` (default `/`)

#### 6. Rolldown WASM Copy (`vrowzer:rolldown`)

Copies `@vrowzer/rolldown` WASM binary and sub-worker to `dist/assets/` during production builds.

#### 7. Service Worker Bundling

Uses `@vrowzer/unplugin-service-worker` to detect, bundle, and deploy the Service Worker with ESM format.

#### 8. Browser IDE (`vrowzer:ide`)

When `experimental.ide` is enabled (dev mode only):

- Serves a pre-built Vue app at `/__vrowzer__/` with File Explorer, Monaco Editor, and Preview
- Provides `/__vrowzer__/client.js` virtual module that imports `vrowzer` and `virtual:vrowzer-manifest`
- Starts a birpc WebSocket server for file sync (write-back edits to local filesystem)
- Watches for external file changes via Vite's chokidar watcher and pushes updates to the IDE

### `VrowzerManifest()`

Transforms `vrowzer-manifest.json` imports (with `?vrowzer` query suffix) by reading referenced files and embedding their contents into the imported object. Supports `files` and `nodeModules` fields. JS files in `nodeModules` are automatically minified with OXC (`minifySync`) to reduce bundle size.

Used in manual mode (`auto: false`) with a pre-generated `vrowzer-manifest.json` file.

```ts
// Import with ?vrowzer query to trigger content resolution
import manifest from './vrowzer-manifest.json?vrowzer'
```

### `generateManifest(options, log?)`

Core manifest generation function, also available as a standalone export from `@vrowzer/vite-plugin/manifest-generate`. Used internally by the auto manifest plugin and by `scripts/generate-manifest.ts`.

```ts
import { generateManifest } from '@vrowzer/vite-plugin/manifest-generate'

const manifest = await generateManifest({
  pkgDir: '/path/to/project',
  sourceDir: '/path/to/project',
  targets: ['vue'],
  name: 'My App'
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
