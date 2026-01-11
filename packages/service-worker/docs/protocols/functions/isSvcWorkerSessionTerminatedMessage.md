[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / isSvcWorkerSessionTerminatedMessage

# Function: isSvcWorkerSessionTerminatedMessage()

```ts
function isSvcWorkerSessionTerminatedMessage(message): message is SvcWorkerSessionTerminatedMessage;
```

Type guard for [SvcWorkerSessionTerminatedMessage](../interfaces/SvcWorkerSessionTerminatedMessage.md)

## Parameters

| Parameter | Type      | Description          |
| --------- | --------- | -------------------- |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerSessionTerminatedMessage`

True if the message is a SvcWorkerSessionTerminatedMessage
