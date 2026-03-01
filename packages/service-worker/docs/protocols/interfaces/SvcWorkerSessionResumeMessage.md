[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionResumeMessage

# Interface: SvcWorkerSessionResumeMessage

Resume message sent from controller to service worker.

Used to restore functionality after a suspend operation.

## Extends

- [`SvcWorkerMessageBase`](SvcWorkerMessageBase.md)

## Properties

| Property | Type | Description | Overrides |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | Request ID for response matching | - |
| <a id="property-type"></a> `type` | `"V_SW_SESSION_RESUME"` | - | [`SvcWorkerMessageBase`](SvcWorkerMessageBase.md).[`type`](SvcWorkerMessageBase.md#property-type) |
