[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerMessageBase

# Interface: SvcWorkerMessageBase

Base message structure for all protocol messages.

## Extended by

- [`SvcWorkerVersionMessage`](SvcWorkerVersionMessage.md)
- [`SvcWorkerVersionResponse`](SvcWorkerVersionResponse.md)
- [`SvcWorkerSkipWaitingMessage`](SvcWorkerSkipWaitingMessage.md)
- [`SvcWorkerClaimClientsMessage`](SvcWorkerClaimClientsMessage.md)
- [`SvcWorkerSessionInitMessage`](SvcWorkerSessionInitMessage.md)
- [`SvcWorkerSessionCloseMessage`](SvcWorkerSessionCloseMessage.md)
- [`SvcWorkerSessionPingMessage`](SvcWorkerSessionPingMessage.md)
- [`SvcWorkerSessionPongMessage`](SvcWorkerSessionPongMessage.md)
- [`SvcWorkerSessionCircuitBreakerMessage`](SvcWorkerSessionCircuitBreakerMessage.md)
- [`SvcWorkerSessionResumeMessage`](SvcWorkerSessionResumeMessage.md)
- [`SvcWorkerSessionTerminatedMessage`](SvcWorkerSessionTerminatedMessage.md)

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-type"></a> `type` | `string` |
