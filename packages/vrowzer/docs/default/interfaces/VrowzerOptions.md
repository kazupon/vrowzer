# Interface: VrowzerOptions

VrowzerOptions defines the configuration options for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md).

## Signature

```ts
export interface VrowzerOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `basePath` _(optional)_ | `string` | The pathname that the preview URLs start with. The previews of each instance load from its own path under it, e.g. `/__preview__/0123456789ab/`, which [Vrowzer.previewBasePath](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#property-previewbasepath) returns. The Service Worker answers the requests within it. When `@vrowzer/vite-plugin` is used, its `basePath` is injected and this option can be omitted. If both are provided, their canonical values must match. Without the plugin, this option defaults to `'/__preview__/'`. |
| `fileSyncTimeout` _(optional)_ | `number` | Timeout in milliseconds for the Web Worker to apply a change made with [Vrowzer.addFile](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-addfile), [Vrowzer.updateFile](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-updatefile) or [Vrowzer.deleteFile](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-deletefile). The Web Worker applies a change after the plugins' `watchChange` hooks finish. This timeout is shorter than the 30 seconds that the Service Worker waits for the Web Worker to answer a request, so with slow plugins or heavy transforms an operation can reject although the change is applied later. Increase it in such environments. Writing the file again resynchronizes it. It also limits how long Vrowzer takes to connect a restarted Service Worker to the Web Worker again. See [VrowzerEventMap.serviceWorkerRecoveryError](/packages/vrowzer/docs/default/type-aliases/VrowzerEventMap.md#property-serviceworkerrecoveryerror). **Default:** `10000` |
| `serviceWorkerReadyTimeout` _(optional)_ | `number` | Timeout in milliseconds for the Service Worker to become the page controller. This timeout does not apply to Service Worker listen readiness or Web Worker setup. **Default:** `60000` |
| `serviceWorkerScope` _(optional)_ | `string` | Service Worker registration scope, independent of `basePath`. When `@vrowzer/vite-plugin` is used, its `serviceWorkerScope` is injected and this option can be omitted. If both are provided, their values must match. Without the plugin, this option defaults to `'/'`. |
| `serviceWorkerVersion` _(optional)_ | `string` | Service Worker version for cache management. When `@vrowzer/vite-plugin` is used, its `serviceWorkerVersion` is injected and this option can be omitted. If both are provided, their values must match. Without the plugin, this option defaults to `'vrowzer-v1'`. |
| `webWorkerSetupTimeout` _(optional)_ | `number` | Timeout in milliseconds for Web Worker setup, measured from Worker creation until `V_WW_SETUP_ACK` is received. This timeout includes loading the Worker transformer and does not apply to Service Worker readiness. Set to `0` for an immediate timeout. **Default:** `90000` |
