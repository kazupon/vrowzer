[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionTerminatedMessage

# Interface: SvcWorkerSessionTerminatedMessage

Terminated notification message (Service Worker -> Page via session MessagePort)

## Extends

- [`SvcWorkerMessageBase`](SvcWorkerMessageBase.md)

## Properties

| Property | Type | Description | Overrides |
| ------ | ------ | ------ | ------ |
| <a id="property-reason"></a> `reason` | `"unregister"` | The reason for termination | - |
| <a id="property-type"></a> `type` | `"V_SW_SESSION_TERMINATED"` | - | [`SvcWorkerMessageBase`](SvcWorkerMessageBase.md).[`type`](SvcWorkerMessageBase.md#property-type) |
