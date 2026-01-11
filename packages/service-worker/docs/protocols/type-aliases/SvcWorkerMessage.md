[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerMessage

# Type Alias: SvcWorkerMessage

```ts
type SvcWorkerMessage =
  | SvcWorkerVersionMessage
  | SvcWorkerSkipWaitingMessage
  | SvcWorkerSessionInitMessage;
```

Union type of all messages from Page to Service Worker (via postMessage)
