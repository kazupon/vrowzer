[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerTerminatedReason

# Type Alias: SvcWorkerTerminatedReason

```ts
type SvcWorkerTerminatedReason = "unregister";
```

Reason why the service worker was terminated.

- `unregister`: Service worker unregistered itself (e.g., via circuit breaker terminate)
