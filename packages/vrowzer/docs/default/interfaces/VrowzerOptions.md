# Interface: VrowzerOptions

VrowzerOptions defines the configuration options for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md).

## Signature

```ts
export interface VrowzerOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `basePath` _(optional)_ | `string` | Preview URL pathname. When `@vrowzer/vite-plugin` is used, its `basePath` is injected and this option can be omitted. If both are provided, their canonical values must match. Without the plugin, this option defaults to `'/__preview__/'`. |
| `serviceWorkerReadyTimeout` _(optional)_ | `number` | Timeout in milliseconds for the Service Worker to become the page controller. This timeout does not apply to Service Worker listen readiness or Web Worker setup. **Default:** `60000` |
| `serviceWorkerScope` _(optional)_ | `string` | Service Worker registration scope, independent of `basePath`. When `@vrowzer/vite-plugin` is used, its `serviceWorkerScope` is injected and this option can be omitted. If both are provided, their values must match. Without the plugin, this option defaults to `'/'`. |
| `serviceWorkerVersion` _(optional)_ | `string` | Service Worker version for cache management. When `@vrowzer/vite-plugin` is used, its `serviceWorkerVersion` is injected and this option can be omitted. If both are provided, their values must match. Without the plugin, this option defaults to `'vrowzer-v1'`. |
