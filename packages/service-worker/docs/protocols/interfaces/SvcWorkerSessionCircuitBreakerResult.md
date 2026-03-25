[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionCircuitBreakerResult

# Interface: SvcWorkerSessionCircuitBreakerResult

Result of a circuit breaker operation.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-cachescleared"></a> `cachesCleared` | `string`[] | Names of caches that were cleared |
| <a id="property-mode"></a> `mode` | [`CircuitBreakerMode`](../type-aliases/CircuitBreakerMode.md) | The mode that was executed |
| <a id="property-terminated"></a> `terminated` | `boolean` | Whether the service worker was terminated (unregistered) |
