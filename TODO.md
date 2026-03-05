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

### Not Yet Ported

- [ ] optimizedDepsPlugin — Dependency pre-bundling optimization
- [ ] watchPackageDataPlugin — package.json change watcher
- [ ] modulePreloadPolyfillPlugin — Module preload polyfill
- [ ] oxcResolvePlugin — OXC-based module resolution (currently using legacy resolvePlugin)
- [ ] htmlInlineProxyPlugin — HTML inline script handling
- [ ] esbuildBannerFooterCompatPlugin — esbuild banner/footer compatibility
- [ ] wasmHelperPlugin — WebAssembly helper injection
- [ ] webWorkerPlugin — Web Worker support
- [ ] nativeWasmFallbackPlugin — WASM fallback
- [ ] definePlugin — Global constant definition
- [ ] clientInjectionsPlugin — Client-side code injection
- [ ] buildHtmlPlugin — Build-time HTML processing
- [ ] workerImportMetaUrlPlugin — Worker import.meta.url handling
- [ ] assetImportMetaUrlPlugin — Asset import.meta.url handling
- [ ] dynamicImportVarsPlugin — Dynamic import variable handling
- [ ] importGlobPlugin — import.meta.glob() support

### Cleanup

- [ ] Remove placeholder-plugin (debug plugin with console.log)

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

### Not Yet Ported

- [ ] memoryFiles.ts — In-memory file serving
- [ ] rejectInvalidRequest.ts — Invalid request rejection
- [ ] rejectNoCorsRequest.ts — CORS validation

## Optimizer

Porting status of `packages/vite-dev-server/src/node/optimizer/`.

### Ported

- [x] index.ts
- [x] scan.ts
- [x] pluginConverter.ts
- [x] optimizer.ts (minimal implementation, Vite version is 27KB)

### Not Yet Ported

- [ ] optimizer.ts full implementation — Full dependency pre-bundling logic
- [ ] resolve.ts — Optimizer-specific module resolution
- [ ] rolldownDepPlugin.ts — Rolldown dependency resolution plugin

## Client

Porting status of `packages/vite-dev-server/src/client/`.

- [x] client.ts
- [x] overlay.ts
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
