[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / CircuitBreakerMode

# Type Alias: CircuitBreakerMode

```ts
type CircuitBreakerMode = "terminate" | "suspend";
```

Circuit breaker mode for service worker control.

- 'terminate': Unregister the service worker (hard kill)
- 'suspend': Disable functionality but keep service worker running (soft kill)
