[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionMessage

# Type Alias: SvcWorkerSessionMessage

```ts
type SvcWorkerSessionMessage =
  | SvcWorkerSessionCloseMessage
  | SvcWorkerSessionPingMessage
  | SvcWorkerSessionPongMessage
  | SvcWorkerSessionCircuitBreakerMessage
  | SvcWorkerSessionResumeMessage
  | SvcWorkerSessionTerminatedMessage;
```

Union type of all session messages (via session MessagePort)
