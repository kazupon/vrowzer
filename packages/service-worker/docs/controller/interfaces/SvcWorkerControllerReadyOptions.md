# Interface: SvcWorkerControllerReadyOptions

An options for Service Worker Controller.

## Signature

```ts
export interface SvcWorkerControllerReadyOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `skipWaitingPolicy` _(optional)_ | [`SkipWaitingPolicy`](/packages/service-worker/docs/controller/type-aliases/SkipWaitingPolicy.md) | Policy for `skipWaiting`. **Default:** `'strict'` |
| `timeout` _(optional)_ | `number` | Timeout in milliseconds to wait for expected service worker to become active. **Default:** `3000` |
| `waitForController` _(optional)_ | `boolean` | Wait for the service worker to become the page controller. When `true`, `ready()` will send a `V_SW_CLAIM_CLIENTS` message to the expected active SW and wait for it to become `navigator.serviceWorker.controller` before returning `true`. When `false` (default), `ready()` returns `true` as soon as the SW is active, even if it's not yet the controller. A `reloadSuggested` event is emitted in this case. **Default:** `false` |
