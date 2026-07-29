# Type Alias: CircuitBreakerMode

Circuit breaker mode for service worker control.

- 'terminate': Unregister the service worker (hard kill)
- 'suspend': Disable functionality but keep service worker running (soft kill)

## Signature

```ts
export type CircuitBreakerMode = "terminate" | "suspend"
```
