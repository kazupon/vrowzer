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

The scope selects which pages the Service Worker controls, not which request URLs it receives from those pages. Vrowzer only responds to same-origin HTTP(S) requests within `basePath`. Cross-origin requests and same-origin requests outside `basePath` are left to the browser's native network path.

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

### Embedding a separate preview

By default, Vrowzer extracts plugins and supported settings from the host Vite config for the preview's Web Worker. This also happens with `auto: false`, which only disables automatic manifest generation. Manual playgrounds can still share the host's Vue or Svelte plugins.

When the host is an editor or application shell and the preview files come from `ready({ files })`, disable automatic manifest generation and give the Web Worker its own config:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    Vrowzer({
      auto: false,
      extract: false,
      workerConfig: './vrowzer.worker.config.ts'
    })
  ]
})
```

```ts
// vrowzer.worker.config.ts: configuration for Vite inside the preview's Web Worker
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte({ compilerOptions: { preserveWhitespace: true } })],
  define: { __PREVIEW_ONLY__: JSON.stringify('preview') },
  resolve: {
    alias: [{ find: 'preview-lib', replacement: '/vendor/preview-lib.js' }],
    dedupe: ['svelte']
  },
  server: { forwardConsole: false }
})
```

`extract: false` does not copy host Vite configuration into the Worker's UserConfig, including resolved `server.origin` and `server.forwardConsole`. The dedicated file is not limited to plugins: it supplies the user settings supported by Vrowzer's Worker-side Vite. Omitted fields are not filled from the host. Host Vite still loads its own config, runs its plugins, and transforms or bundles the host application and Worker assets.

These options belong to `@vrowzer/vite-plugin`, not the runtime `Vrowzer()` or `ready()` API. The dedicated config is loaded by the Web Worker, not the Service Worker. It does not make Node-only plugins or host HTTP server features such as port binding and proxying available inside a browser.

| `workerConfig` | `extract` | Worker user config |
| --- | --- | --- |
| Provided | Omitted or `false` | Dedicated file, without host config extraction or server-setting forwarding |
| Provided | Explicit `true` | Configuration error |
| Omitted | `false` | Empty user-plugin list; no host server settings |
| Omitted | Omitted or `true` | Existing host extraction behavior |

Without a dedicated file, `extract: false` still prebundles `export default { plugins: [] }`, even with `configFile: false`. Built-in Worker plugins and runtime defaults remain active. `auto` controls manifest generation independently; it does not select the config source.

### Dedicated config syntax and dependencies

Relative `workerConfig` paths are resolved from the host config file's directory, or from Vite's `root` when `configFile` is disabled. Absolute paths are also supported. Missing files, directories, unsupported export forms and bundle failures are errors; they do not fall back to empty plugins.

The entry must be an ESM `.ts`, `.mts`, `.js` or `.mjs` file exporting an object. A plain `export default { ... }`, an imported Vite `defineConfig(object)` helper (including an import alias), or a same-file `const` object is supported. TypeScript `as` / `satisfies` wrappers are allowed. Root callbacks, promises, arrays, arbitrary factory calls and default re-exports are rejected during host config resolution.

Only the outer export shape is statically validated. The original module is prebundled without executing its plugin factories on the host, so plugin options, functions, local bindings, spreads and relative imports are retained for evaluation in the Worker. Validation is not a sandbox or a guarantee that arbitrary plugin code can run in a browser.

Use a plain object or `defineConfig` from `vite` in this file. Runtime imports of `vite-plus` and `@vrowzer/vite-plugin`, including through helpers, are rejected. Vite+'s helper injects host tooling and is not equivalent to Vite's identity helper. Type-only imports are allowed; the host config may still use Vite+ normally.

Supported static `readFileSync(path, 'utf8')` / `'utf-8'` calls at module initialization are inlined from the entry or local helpers. Paths can be string literals, imported `resolve(...)` calls with static arguments, or `new URL('./file', import.meta.url)`. Literal relative paths use the source module's directory. Static `createRequire(import.meta.url)('./file.json')` calls are also inlined. Mixed imports and unconverted runtime calls are preserved. Dynamic filesystem access is not automatically converted into browser filesystem access.

Local config modules retain their original `import.meta.dirname`, `import.meta.filename` and `import.meta.url` locations. Third-party asset URLs are not rewritten this way, and these strings do not grant browser access to the host filesystem.

### Migrating existing embedding configs

> [!WARNING]
> `extract: false` previously forwarded the host's resolved `server.origin` and `server.forwardConsole`. It no longer does. Move any preview-specific values to the dedicated file. Leaving a value out uses Worker defaults; it does not necessarily disable that feature.

For example, move a preview asset origin and console preference into the Worker config:

```ts
// vrowzer.worker.config.ts
export default {
  server: {
    origin: 'https://preview-assets.example.com',
    forwardConsole: false
  },
  resolve: {
    alias: [{ find: 'preview-lib', replacement: '/vendor/preview-lib.js' }]
  }
}
```

The legacy plugin option `Vrowzer({ resolve })` is still supported. When extraction is disabled, it emits a migration warning on the host during dev and build config resolution. Create a `workerConfig` file if needed, move `resolve` there, and remove the old option to stop the warning.

While present, the legacy option replaces the **entire** Worker `resolve` object, including a dedicated file's `dedupe` or other settings. Even `resolve: {}` replaces it with an empty object. There is no alias concatenation or deep merge. Ordinary host extraction does not emit this migration warning. The host's top-level `resolve` is a separate setting, not this compatibility option.

> [!WARNING]
> `experimental.enableNativePlugin` is no longer supported. Native Rolldown plugins are selected per environment by `isBundled`, which is `false` in the standard preview Worker. Remove the option from `workerConfig`; a leftover value is ignored, and the Worker logs a warning.

### Runtime-owned settings

The standard `initWebWorker()` path keeps the preview aligned with the Service Worker. Omit the following settings from the dedicated config; conflicting direct values or changes made by config hooks fail through the existing Worker setup error path:

| Setting | Runtime value |
| --- | --- |
| `root` | `/`, the virtual filesystem root |
| `base` | The preview `basePath`; configure that through the host Vrowzer plugin |
| `publicDir` | `public`, resolved to `/public` |
| Dependency optimizer | No optimizer is created or initialized in Worker environments, regardless of framework normalization of the deprecated `optimizeDeps.disabled` flag |
| `experimental.importGlobRestoreExtension` | `false` |
| `experimental.hmrPartialAccept` | `false` |
| `experimental.bundledDev` | `false` |

Equivalent values are accepted. Other `optimizeDeps` and `experimental` fields remain usable without removing the runtime-owned defaults. This is a limited merge of these two blocks, not a host-config merge. The checks are not enabled by default for standalone use of the lower-level dev-server APIs.

The runtime supplies `optimizeDeps.disabled: true`, and directly overriding it is unsupported. Framework hooks may normalize this deprecated field, such as Svelte changing it to `'build'`. Vrowzer keeps dependency optimization disabled through the environment creation context instead of requiring the resolved flag to remain `true`.

### Editing the dedicated config

In dev, changes to the dedicated file, local imports and inlined text / JSON require the host server to restart and the page to reload so a new Worker evaluates the plugins. This is separate from preview-source HMR through `updateFile()`. Reloading can discard unsaved editor state.

Vrowzer uses the host's existing watcher, including for local dependencies outside the host root. Failed generation preserves the last working bundle and keeps newly discovered dependencies watched, so fixing the failing helper or creating missing input data triggers another attempt. Edits received during a restart are processed again when necessary, without repeatedly retrying unchanged errors.

Normal production builds are supported. `workerConfig` together with `build.watch` is rejected in this initial implementation. Disabling the host watcher with `server.watch: null` also disables automatic config updates.

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

  // Extract the host Vite config for the preview's Web Worker
  // Default: true without workerConfig (independent of auto)
  extract: true,

  // For a dedicated Worker config, replace extract: true above with extract: false:
  // workerConfig: './vrowzer.worker.config.ts',

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
| `extract`              | `boolean`                    | `true` without `workerConfig`              | Copy host plugins and supported config into the preview Worker. `false` also stops host server-setting forwarding. |
| `workerConfig`         | `string`                     | `undefined`                               | ESM config file for the Web Worker. Disables extraction when `extract` is omitted; explicit `true` conflicts. |
| `manifest`             | `VrowzerManifestOptions`     | `undefined`                               | Auto manifest options (sourceDir, pkgDir, targets). Used when `auto: true`.               |
| `experimental`         | `VrowzerExperimentalOptions` | `undefined`                               | Experimental features. Currently supports `ide`.                                          |
| `basePath`             | `string`                     | `'/__preview__/'`                         | Preview URL pathname shared with the application and Service Worker bundles.              |
| `serviceWorkerScope`   | `string`                     | `'/'`                                     | Registration scope and `Service-Worker-Allowed` header injected into the runtime.          |
| `serviceWorkerVersion` | `string`                     | `'vrowzer-v1'`                            | Version shared with the application and Service Worker bundles.                           |
| `serviceWorkerEntry`   | `string`                     | Resolved path to `vrowzer/service-worker` | Explicit Service Worker entry file path.                                                  |
| `resolve`              | `{ alias?: Alias[] }`        | `undefined`                               | Legacy Worker resolve replacement. With extraction disabled, warns to move it to `workerConfig`. |

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

Selects a dedicated `workerConfig` file, an empty config when extraction is disabled, or supported settings extracted from the host config. It then prebundles that input with Rolldown for the Web Worker. The prebundled config is written to `node_modules/.vrowzer/config.bundled.mjs`.

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
