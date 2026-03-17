# @vrowser/vite-plugin

Vite plugin for [vrowser](https://github.com/kazupon/vrowser) - browser-based Vite dev server preview system.

This plugin configures Vite for running `@vrowser/vite-dev-server` in Service Worker and Web Worker environments. It handles auto manifest generation, Node.js polyfills, CORS headers, `process` global injection, WASM file copying, Worker config extraction/prebundling, Service Worker bundling, and an experimental browser IDE.

## 💿 Installation

```sh
# npm
npm install -D @vrowser/vite-plugin

# pnpm
pnpm add -D @vrowser/vite-plugin

# yarn
yarn add -D @vrowser/vite-plugin
```

## 🚀 Usage

### Auto mode (default)

The plugin automatically generates a manifest from the project's `package.json` dependencies and source files. No manual manifest file or `VrowserManifest()` plugin is needed.

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), Vrowser()]
})
```

The auto-generated manifest is available via the `virtual:vrowser-manifest` virtual module:

```ts
import manifest from 'virtual:vrowser-manifest'

const vrowser = Vrowser({ basePath: '/__preview__/' })
await vrowser.ready({
  files: { ...manifest.files, ...manifest.nodeModules }
})
```

When the host page and preview content are in different directories, use `manifest.sourceDir`:

```ts
Vrowser({
  manifest: {
    sourceDir: './app', // scan ./app/ for preview content
    targets: ['vue'] // only include vue (+ transitive deps)
  }
})
```

### Manual mode

For advanced use cases (e.g. multiple fixtures), disable auto mode and use `VrowserManifest()` with a manually created `vrowser-manifest.json`.

```ts
// vite.config.ts
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [VrowserManifest(), Vrowser({ auto: false })]
})
```

### Browser IDE (experimental)

Enable the browser IDE to get a full development environment at `/__vrowser__/` with File Explorer, Monaco Editor, and live Preview.

```ts
Vrowser({
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
- **Live Preview** powered by vrowser (HMR via Web Worker + Service Worker)
- **File sync** via birpc WebSocket (edits are saved to local filesystem)

On `vite dev`, the IDE URL is printed in the console:

```
  ➜  Local:   http://localhost:5173/
  ➜  Vrowser IDE: http://localhost:5173/__vrowser__/
```

You can also specify a custom port for the birpc WebSocket server:

```ts
Vrowser({
  experimental: {
    ide: { port: 7900 }
  }
})
```

## ⚙️ Options

```ts
Vrowser({
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
    // Enable browser IDE at /__vrowser__/
    // Default: false
    ide: true // or { port: 7900 }
  },

  // Base path for the preview system
  // Default: '/__preview__/'
  basePath: '/__preview__/',

  // Service Worker scope
  // Default: '/'
  serviceWorkerScope: '/',

  // Service Worker version for cache management
  // Default: 'SERVICE_WORKER_VERSION'
  serviceWorkerVersion: 'my-app-v1',

  // Explicit Service Worker entry file path
  // Default: Resolved path to 'vrowser/service-worker'
  serviceWorkerEntry: 'vrowser/service-worker',

  // Worker-specific resolve settings
  // Default: undefined
  resolve: {
    alias: [{ find: 'my-lib', replacement: '/libs/my-lib.js' }]
  }
})
```

| Option                 | Type                         | Default                                   | Description                                                                               |
| ---------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `auto`                 | `boolean`                    | `true`                                    | Enable auto manifest generation. Set `false` to use `VrowserManifest()` manually.         |
| `manifest`             | `VrowserManifestOptions`     | `undefined`                               | Auto manifest options (sourceDir, pkgDir, targets). Used when `auto: true`.               |
| `experimental`         | `VrowserExperimentalOptions` | `undefined`                               | Experimental features. Currently supports `ide`.                                          |
| `basePath`             | `string`                     | `'/__preview__/'`                         | Base path for the preview system. The Service Worker intercepts requests under this path. |
| `serviceWorkerScope`   | `string`                     | `'/'`                                     | The scope for the Service Worker registration.                                            |
| `serviceWorkerVersion` | `string`                     | `'SERVICE_WORKER_VERSION'`                | Version string for Service Worker cache management.                                       |
| `serviceWorkerEntry`   | `string`                     | Resolved path to `vrowser/service-worker` | Explicit Service Worker entry file path.                                                  |
| `resolve`              | `{ alias?: Alias[] }`        | `undefined`                               | Worker-specific resolve settings passed to the internal Vite dev server.                  |

### `VrowserManifestOptions`

| Option      | Type       | Default           | Description                                                             |
| ----------- | ---------- | ----------------- | ----------------------------------------------------------------------- |
| `sourceDir` | `string`   | Vite project root | Directory to scan for project source files (index.html, src/, public/). |
| `pkgDir`    | `string`   | Vite project root | Package directory for node_modules resolution.                          |
| `targets`   | `string[]` | all dependencies  | Package name(s) to include. Only these packages + transitive deps.      |

### `VrowserExperimentalOptions`

| Option | Type                           | Default | Description                                                      |
| ------ | ------------------------------ | ------- | ---------------------------------------------------------------- |
| `ide`  | `boolean \| VrowserIdeOptions` | `false` | Enable browser IDE at `/__vrowser__/`. `true` uses all defaults. |

### `VrowserIdeOptions`

| Option | Type     | Default | Description                          |
| ------ | -------- | ------- | ------------------------------------ |
| `port` | `number` | auto    | Port for the birpc WebSocket server. |

## 🔌 Exported Plugins

### `Vrowser(options?)`

Returns an array of Vite plugins that configure the environment for vrowser:

#### 1. Auto Manifest Generation (`vrowser:auto-manifest`)

When `auto: true` (default), automatically generates a vrowser manifest in `configResolved`:

- Scans project source files (index.html, src/, public/)
- Collects npm dependencies from package.json
- Auto-bundles CJS packages to ESM using Rolldown
- Caches results in `node_modules/.vrowser-manifest/` (keyed by deps + lockfile hash)
- Provides `virtual:vrowser-manifest` virtual module with file contents resolved

#### 2. Worker Config Extraction & Prebundling (`vrowser:config`)

Auto-extracts user plugins from `vite.config.ts` using OXC parser, then pre-bundles them with Rolldown for the Web Worker environment. The prebundled config is written to `node_modules/.vrowser/config.bundled.mjs`.

- Resolves `@vrowser/*` imports from the plugin's own dependency graph
- Inlines `readFileSync()` and `createRequire()` calls for Worker compatibility
- Maps `vite` imports to `@vrowser/vite-dev-server/vite`

#### 3. Preview Guard Middleware (`vrowser:server-middleware`)

Prevents Vite's SPA fallback from serving `index.html` for `basePath` requests when the Service Worker is not yet active. Returns a 503 with auto-retry instead.

#### 4. Process Global Injection

Injects `process` polyfill (`@vrowser/node-polyfill/process`) for browser/Worker environments:

- **Dev mode**: Uses `@rollup/plugin-inject`
- **Build mode**: Uses Rolldown's native `transform.inject`

#### 5. Environment Configuration (`vrowser:env`)

Sets up Vite configuration for the browser-based Vite dev server:

- **`resolve.alias`** — Maps Node.js built-in modules (`node:fs`, `node:path`, `node:events`, etc.) to browser-compatible polyfills
- **`worker.format`** — Set to `'es'` for ES Module workers
- **CORS headers** — `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`, plus `Service-Worker-Allowed: /`

#### 6. Rolldown WASM Copy (`vrowser:rolldown`)

Copies `@vrowser/rolldown` WASM binary and sub-worker to `dist/assets/` during production builds.

#### 7. Service Worker Bundling

Uses `@vrowser/unplugin-service-worker` to detect, bundle, and deploy the Service Worker with ESM format.

#### 8. Browser IDE (`vrowser:ide`)

When `experimental.ide` is enabled (dev mode only):

- Serves a pre-built Vue app at `/__vrowser__/` with File Explorer, Monaco Editor, and Preview
- Provides `/__vrowser__/client.js` virtual module that imports `vrowser` and `virtual:vrowser-manifest`
- Starts a birpc WebSocket server for file sync (write-back edits to local filesystem)
- Watches for external file changes via Vite's chokidar watcher and pushes updates to the IDE

### `VrowserManifest()`

Transforms `vrowser-manifest.json` imports (with `?vrowser` query suffix) by reading referenced files and embedding their contents into the imported object. Supports `files` and `nodeModules` fields. JS files in `nodeModules` are automatically minified with OXC (`minifySync`) to reduce bundle size.

Used in manual mode (`auto: false`) with a pre-generated `vrowser-manifest.json` file.

```ts
// Import with ?vrowser query to trigger content resolution
import manifest from './vrowser-manifest.json?vrowser'
```

### `generateManifest(options, log?)`

Core manifest generation function, also available as a standalone export from `@vrowser/vite-plugin/manifest-generate`. Used internally by the auto manifest plugin and by `scripts/generate-manifest.ts`.

```ts
import { generateManifest } from '@vrowser/vite-plugin/manifest-generate'

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
