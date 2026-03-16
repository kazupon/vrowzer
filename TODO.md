# vrowser TODO

Porting status from refers/vite and remaining tasks.

## Plugins (`@vrowser/vite-dev-server`)

Porting status of `resolvePlugins` (packages/vite-dev-server/src/node/plugins/index.ts).

### Ported

- [x] preAliasPlugin
- [x] aliasPlugin (`@rollup/plugin-alias`)
- [x] resolvePlugin
- [x] cssPlugin (css native partially, remain sass/less/stylus/lightningcss/esbuild)
- [x] cssPostPlugin
- [x] cssAnalysisPlugin
- [x] oxcPlugin
- [x] jsonPlugin
- [x] assetPlugin
- [x] importAnalysisPlugin
- [x] clientInjectionsPlugin — `process.env.NODE_ENV` replacement via `replaceDefine` + `transformSync`

### Not Yet Ported

- [ ] optimizedDepsPlugin — Dependency pre-bundling optimization (optimizer disabled in Worker)
- [ ] watchPackageDataPlugin — package.json change watcher
- [ ] modulePreloadPolyfillPlugin — Module preload polyfill
- [ ] htmlInlineProxyPlugin — HTML inline script handling
- [ ] wasmHelperPlugin — WebAssembly helper injection
- [ ] webWorkerPlugin — Web Worker support
- [ ] nativeWasmFallbackPlugin — WASM fallback
- [ ] definePlugin — Global constant definition (partial: `clientInjectionsPlugin` handles `process.env.NODE_ENV`)
- [ ] buildHtmlPlugin — Build-time HTML processing
- [ ] workerImportMetaUrlPlugin — Worker import.meta.url handling
- [ ] assetImportMetaUrlPlugin — Asset import.meta.url handling
- [ ] dynamicImportVarsPlugin — Dynamic import variable handling
- [ ] importGlobPlugin — import.meta.glob() support

## Server Middleware

Porting status of `packages/vite-dev-server/src/node/server/middlewares/`.

### Ported

- [x] base.ts
- [x] error.ts
- [x] hostCheck.ts
- [x] htmlFallback.ts
- [x] indexHtml.ts
- [x] notFound.ts
- [x] proxy.ts
- [x] static.ts
- [x] time.ts
- [x] transform.ts
- [x] crossOrigin.ts — vrowser-specific CORS headers

### Not Yet Ported

- [ ] memoryFiles.ts — In-memory file serving (added in Vite 8.0.0)
- [ ] rejectInvalidRequest.ts — Invalid request rejection
- [ ] rejectNoCorsRequest.ts — CORS validation

## Optimizer

Porting status of `packages/vite-dev-server/src/node/optimizer/`.

### Ported

- [x] index.ts
- [x] scan.ts
- [x] pluginConverter.ts
- [x] optimizer.ts (minimal implementation)

### Status

Optimizer is disabled in Worker via `disableDepsOptimizer: true`.
CJS packages (React) are pre-bundled to ESM by `gen:manifest` instead.

## Client

Porting status of `packages/vite-dev-server/src/client/`.

- [x] client.ts — `declare const` placeholders for `clientInjectionsPlugin`
- [x] overlay.ts — Same pattern as client.ts
- [ ] env.ts — Environment variable injection (currently minimal)

## Shared

Porting status of `packages/vite-dev-server/src/shared/`.

### Ported

- [x] hmr.ts
- [x] hmrHandler.ts
- [x] invokeMethods.ts
- [x] moduleRunnerTransport.ts
- [x] utils.ts
- [x] constants.ts
- [x] builtin.ts

### Not Yet Ported

- [ ] ssrTransform.ts — SSR transform

## `@vrowser/vite-plugin`

- [x] env.ts — Node.js polyfill aliases + CORS headers
- [x] prebundle.ts — Worker config prebundling with rolldown
- [x] extract.ts — OXC-based vite.config.ts plugin extraction
- [x] manifest.ts — VrowserManifest plugin (file content resolution + OXC minify)
- [x] alias.ts — Shared Node.js polyfill alias helper (`resolveAliases`)
- [x] server.ts — Preview guard middleware
- [x] rolldown.ts — WASM/Worker asset copying
- [x] virtual.ts — Worker entry generation

## `@vrowser/rolldown`

- [x] @rolldown/browser 1.0.0-rc.9 upgrade
- [x] utils API: `transform`, `transformSync`, `parse`, `parseSync`, `minify`, `minifySync`, `TsconfigCache`
- [ ] Visitor / ESTree types — Not available in `@rolldown/browser/experimental`

## `scripts/generate-manifest.ts`

- [x] CJS → ESM auto-bundling (React etc.)
- [x] `isCjsPackage` improvement (ESM exports detection for Vue)
- [x] `package.json` inclusion for all packages
- [x] OXC minify for nodeModules JS files

## play-vrowser

- [x] FileExplorer with Iconify vscode-icons (tree view, recursive)
- [x] SplitPane resizable panels
- [x] Lazy manifest loading (only selected fixture loaded)
- [x] Fixture ordering (Vue first)
- [x] SVG / Svelte syntax highlighting
- [x] DevTools env var control (`VITE_DEVTOOLS=1`)
- [x] iframe `allow-popups-to-escape-sandbox`
- [ ] VrowserManifest auto-generation — Zero-config

## Testing

- [x] E2E tests: nodeModules migration (vendor removed)
- [x] Unit tests: `service-worker:unit` timeout/parallelism fix
- [x] Integration tests: sequential execution via `pnpm run --sequential`
- [x] Integration tests: vite.config.ts root fix for `service-worker:integration`
- [ ] vite-dev-server browser tests — Currently disabled (flaky SW-based tests)
