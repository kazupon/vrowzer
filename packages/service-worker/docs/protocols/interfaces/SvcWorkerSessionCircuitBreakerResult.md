# Interface: SvcWorkerSessionCircuitBreakerResult

Result of a circuit breaker operation.

## Signature

```ts
export interface SvcWorkerSessionCircuitBreakerResult
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `cachesCleared` | `string[]` | Names of caches that were cleared |
| `mode` | [`CircuitBreakerMode`](/packages/service-worker/docs/protocols/type-aliases/CircuitBreakerMode.md) | The mode that was executed |
| `terminated` | `boolean` | Whether the service worker was terminated (unregistered) |
