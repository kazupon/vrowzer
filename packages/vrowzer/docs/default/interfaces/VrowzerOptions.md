# Interface: VrowzerOptions

VrowzerOptions defines the configuration options for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md).

## Signature

```ts
export interface VrowzerOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `basePath` _(optional)_ | `string` | Preview base path (default: '/__preview__/') |
| `serviceWorkerScope` _(optional)_ | `string` | Service Worker scope (default: '/') |
| `serviceWorkerVersion` _(optional)_ | `string` | Service Worker version for cache management (default: 'vrowzer-v1') |
