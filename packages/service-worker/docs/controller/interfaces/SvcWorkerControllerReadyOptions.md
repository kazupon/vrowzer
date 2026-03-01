[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerControllerReadyOptions

# Interface: SvcWorkerControllerReadyOptions

An options for SvcWorkerController.re \| Service Worker Controller.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-skipwaitingpolicy"></a> `skipWaitingPolicy?` | [`SkipWaitingPolicy`](../type-aliases/SkipWaitingPolicy.md) | Policy for `skipWaiting`. **Default** `'strict'` |
| <a id="property-timeout"></a> `timeout?` | `number` | Timeout in milliseconds to wait for expected service worker to become active. **Default** `3000` |
| <a id="property-waitforcontroller"></a> `waitForController?` | `boolean` | Wait for the service worker to become the page controller. When `true`, `ready()` will send a `V_SW_CLAIM_CLIENTS` message to the active SW and wait for `navigator.serviceWorker.controller` to become non-null before returning `true`. When `false` (default), `ready()` returns `true` as soon as the SW is active, even if it's not yet the controller. A `reloadSuggested` event is emitted in this case. **Default** `false` |
