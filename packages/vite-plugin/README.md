# @vrowser/vite-plugin

Vite plugin for [vrowser](https://github.com/kazupon/vrowser) - browser-based Vite dev server preview system.

This plugin configures Vite for running `@vrowser/vite-dev-server` in Service Worker and Web Worker environments. It handles Node.js polyfills, CORS headers, `process` global injection, WASM file copying, and Service Worker bundling.

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
import { Vrowser } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    Vrowser({
      basePath: '/__preview__/',
      serviceWorkerEntry: './node_modules/vrowser/dist/service-worker.ts'
    })
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
  // Default: 'SEVICE_WORKER_VERSION'
  serviceWorkerVersion: 'my-app-v1',

  // Explicit Service Worker entry file path
  // Required when using a library-provided SW (e.g. vrowser)
  // Default: undefined
  serviceWorkerEntry: './node_modules/vrowser/dist/service-worker.ts'
})
```

| Option                 | Type                  | Default                   | Description                                                                                             |
| ---------------------- | --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `basePath`             | `string`              | `'/__preview__/'`         | Base path for the preview system. The Service Worker intercepts requests under this path.               |
| `serviceWorkerScope`   | `string`              | `'/'`                     | The scope for the Service Worker registration.                                                          |
| `serviceWorkerVersion` | `string`              | `'SEVICE_WORKER_VERSION'` | Version string for Service Worker cache management.                                                     |
| `serviceWorkerEntry`   | `string \| undefined` | `undefined`               | Explicit Service Worker entry file path. Required when using a library-provided SW from `node_modules`. |

## 📖 What This Plugin Does

`Vrowser()` returns an array of Vite plugins that together configure the environment for vrowser:

### 1. Preview Guard Middleware (`vrowser:server-middleware`)

Prevents Vite's SPA fallback from serving `index.html` for `basePath` requests when the Service Worker is not yet active. Returns a 503 with auto-retry instead.

### 2. Process Global Injection

Injects `process` polyfill (`@vrowser/node-polyfill/process`) for browser/Worker environments where `process` is not available:

- **Dev mode**: Uses `@rollup/plugin-inject` (Rolldown transforms are not available during `vite serve`)
- **Build mode**: Uses Rolldown's native `transform.inject`

### 3. Core Configuration (`vrowser:core`)

Sets up Vite configuration required for the browser-based Vite dev server:

- **`resolve.alias`** - Maps Node.js built-in modules (`node:fs`, `node:path`, `node:events`, etc.) to browser-compatible polyfills
- **`worker.format`** - Set to `'es'` for ES Module workers
- **CORS headers** - `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` for both dev and preview servers, plus `Service-Worker-Allowed: /`
- **`define`** - Forwards `DEBUG` env var via `import.meta.env.DEBUG`

### 4. Rolldown WASM Copy (`vrowser:rolldown`)

Copies `@vrowser/rolldown` WASM binary (`rolldown-binding.wasm32-wasi.wasm`) and sub-worker (`worker.js`) to `dist/assets/` during production builds.

### 5. Service Worker Bundling

Uses `@vrowser/unplugin-service-worker` to detect, bundle, and deploy the Service Worker with ESM format and `Service-Worker-Allowed: /` header.

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
