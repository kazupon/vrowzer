[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / StateChangeInfo

# Interface: StateChangeInfo

[Service Worker Controller](SvcWorkerController.md) state change information.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-serviceworker"></a> `serviceWorker` | `ServiceWorker` | The ServiceWorker \| service worker instance that triggered the state change. |
| <a id="property-state"></a> `state` | [`SvcWorkerControllerState`](../type-aliases/SvcWorkerControllerState.md) | The current state of the [SvcWorkerController](SvcWorkerController.md). |
| <a id="property-version"></a> `version` | `string` | The version of the service worker that triggered the state change. |
