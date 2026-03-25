[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerControllerEventMap

# Type Alias: SvcWorkerControllerEventMap

```ts
type SvcWorkerControllerEventMap = object;
```

Event map for [SvcWorkerController](../interfaces/SvcWorkerController.md).

This type defines the payload types for each event.
When subscribing to events via `on()`, you receive these payload types.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-changestate"></a> `changeState` | [`StateChangeInfo`](../interfaces/StateChangeInfo.md) | Called when [SvcWorkerController](../interfaces/SvcWorkerController.md) state changes. Use this for UI updates during service worker lifecycle (e.g., showing "Installing...", "Waiting...", etc.) Payload is [StateChangeInfo](../interfaces/StateChangeInfo.md) |
| <a id="property-progress"></a> `progress` | `string` | Service worker controller progress hook. This callback is useful to debug or UI/telemetry. Payload is the current phase description string. |
| <a id="property-reloadsuggested"></a> `reloadSuggested` | [`ReloadSuggestInfo`](../interfaces/ReloadSuggestInfo.md) | Called once when we detect that expected service worker is active/ready to take over, but the page controller isn't switching (often due to missing `clients.claim()` or needing navigation). You can show UI like: "Update ready. Reload to apply." Payload is [ReloadSuggestInfo](../interfaces/ReloadSuggestInfo.md) |
| <a id="property-resumed"></a> `resumed` | `void` | Fired when the service worker is resumed after suspension. Functionality has been restored. |
| <a id="property-suspended"></a> `suspended` | `void` | Fired when the service worker is suspended (soft kill / circuit breaker engaged). The service worker remains registered but functionality is disabled. |
| <a id="property-terminated"></a> `terminated` | [`SvcWorkerTerminatedReason`](../../protocols/type-aliases/SvcWorkerTerminatedReason.md) | Fired when the service worker is terminated (hard kill / circuit breaker tripped). The service worker has been unregistered. Payload is the reason for termination. |
