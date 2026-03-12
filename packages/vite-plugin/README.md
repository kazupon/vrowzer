# @vrowser/vite-plugin

Vite plugin for [vrowser](https://github.com/kazupon/vrowser) - browser-based Vite dev server preview system.

This plugin configures Vite for running `@vrowser/vite-dev-server` in Service Worker and Web Worker environments. It handles Node.js polyfills, CORS headers, `process` global injection, WASM file copying, Worker config extraction/prebundling, and Service Worker bundling.

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

```ts
// vite.config.ts
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // Transform vrowser-manifest.json imports to inline file contents
    VrowserManifest(),
    // Configure vrowser preview system
    Vrowser()
  ]
})
```

## ⚙️ Options

```ts
Vrowser({
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

  // Worker-specific resolve settings (e.g. vendor aliases)
  // These are passed to the Worker's internal Vite dev server, not the host.
  // Default: undefined
  resolve: {
    alias: [{ find: 'react', replacement: '/vendor/react.js' }]
  },

  // Explicit Worker config file path (legacy mode)
  // When omitted, plugins are auto-extracted from vite.config.ts
  // Default: undefined
  workerConfig: './vrowser.config.ts'
})
```

| Option                 | Type                  | Default                                   | Description                                                                               |
| ---------------------- | --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `basePath`             | `string`              | `'/__preview__/'`                         | Base path for the preview system. The Service Worker intercepts requests under this path. |
| `serviceWorkerScope`   | `string`              | `'/'`                                     | The scope for the Service Worker registration.                                            |
| `serviceWorkerVersion` | `string`              | `'SERVICE_WORKER_VERSION'`                | Version string for Service Worker cache management.                                       |
| `serviceWorkerEntry`   | `string`              | Resolved path to `vrowser/service-worker` | Explicit Service Worker entry file path.                                                  |
| `resolve`              | `{ alias?: Alias[] }` | `undefined`                               | Worker-specific resolve settings (vendor aliases for browser runtime).                    |
| `workerConfig`         | `string`              | `undefined`                               | Explicit Worker config file path. Skips auto-extraction from vite.config.ts.              |

## 🔌 Exported Plugins

### `Vrowser(options?)`

Returns an array of Vite plugins that configure the environment for vrowser:

#### 1. Worker Config Extraction & Prebundling (`vrowser:config`)

Auto-extracts user plugins from `vite.config.ts` using OXC parser, then pre-bundles them with Rolldown for the Web Worker environment. The prebundled config is written to `node_modules/.vrowser/config.bundled.mjs`.

- Resolves `@vrowser/*` imports from the plugin's own dependency graph
- Inlines `readFileSync()` and `createRequire()` calls for Worker compatibility
- Maps `vite` imports to `@vrowser/vite-dev-server/vite`

#### 2. Preview Guard Middleware (`vrowser:server-middleware`)

Prevents Vite's SPA fallback from serving `index.html` for `basePath` requests when the Service Worker is not yet active. Returns a 503 with auto-retry instead.

#### 3. Process Global Injection

Injects `process` polyfill (`@vrowser/node-polyfill/process`) for browser/Worker environments:

- **Dev mode**: Uses `@rollup/plugin-inject`
- **Build mode**: Uses Rolldown's native `transform.inject`

#### 4. Core Configuration (`vrowser:core`)

Sets up Vite configuration for the browser-based Vite dev server:

- **`resolve.alias`** — Maps Node.js built-in modules (`node:fs`, `node:path`, `node:events`, etc.) to browser-compatible polyfills
- **`worker.format`** — Set to `'es'` for ES Module workers
- **CORS headers** — `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`, plus `Service-Worker-Allowed: /`

#### 5. Rolldown WASM Copy (`vrowser:rolldown`)

Copies `@vrowser/rolldown` WASM binary and sub-worker to `dist/assets/` during production builds.

#### 6. Service Worker Bundling

Uses `@vrowser/unplugin-service-worker` to detect, bundle, and deploy the Service Worker with ESM format.

### `VrowserManifest()`

Transforms `vrowser-manifest.json` imports (with `?vrowser` query suffix) by reading referenced files and embedding their contents into the imported object. Supports `files`, `vendor`, and `nodeModules` fields.

```ts
// Import with ?vrowser query to trigger content resolution
const manifests = import.meta.glob('./fixtures/*/vrowser-manifest.json', {
  eager: true,
  query: '?vrowser'
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
