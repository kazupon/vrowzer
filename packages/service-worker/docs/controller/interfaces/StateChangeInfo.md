# Interface: StateChangeInfo

[Service Worker Controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) state change information.

## Signature

```ts
export interface StateChangeInfo
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `serviceWorker` | `ServiceWorker` | The service worker instance that triggered the state change. |
| `state` | [`SvcWorkerControllerState`](/packages/service-worker/docs/controller/type-aliases/SvcWorkerControllerState.md) | The current state of the [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md). |
| `version` | `string` | The version of the service worker that triggered the state change. |
