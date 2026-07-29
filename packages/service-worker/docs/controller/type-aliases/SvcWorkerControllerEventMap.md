# Type Alias: SvcWorkerControllerEventMap

Event map for [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md).

This type defines the payload types for each event.
When subscribing to events via `on()`, you receive these payload types.

## Signature

```ts
export type SvcWorkerControllerEventMap = { progress: string; reloadSuggested: ReloadSuggestInfo; changeState: StateChangeInfo; suspended: void; terminated: SvcWorkerTerminatedReason; resumed: void }
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `changeState` | [`StateChangeInfo`](/packages/service-worker/docs/controller/interfaces/StateChangeInfo.md) | Called when [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) state changes. Use this for UI updates during service worker lifecycle (e.g., showing "Installing...", "Waiting...", etc.) Payload is [StateChangeInfo](/packages/service-worker/docs/controller/interfaces/StateChangeInfo.md) |
| `progress` | `string` | Service worker controller progress hook. This callback is useful to debug or UI/telemetry. Payload is the current phase description string. |
| `reloadSuggested` | [`ReloadSuggestInfo`](/packages/service-worker/docs/controller/interfaces/ReloadSuggestInfo.md) | Called once when we detect that expected service worker is active/ready to take over, but the page controller isn't switching (often due to missing `clients.claim()` or needing navigation). You can show UI like: "Update ready. Reload to apply." Payload is [ReloadSuggestInfo](/packages/service-worker/docs/controller/interfaces/ReloadSuggestInfo.md) |
| `resumed` | `void` | Fired when the service worker is resumed after suspension. Functionality has been restored. |
| `suspended` | `void` | Fired when the service worker is suspended (soft kill / circuit breaker engaged). The service worker remains registered but functionality is disabled. |
| `terminated` | [`SvcWorkerTerminatedReason`](/packages/service-worker/docs/protocols/type-aliases/SvcWorkerTerminatedReason.md) | Fired when the service worker is terminated (hard kill / circuit breaker tripped). The service worker has been unregistered. Payload is the reason for termination. |
