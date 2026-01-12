[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / isSvcWorkerSessionPingMessage

# Function: isSvcWorkerSessionPingMessage()

```ts
function isSvcWorkerSessionPingMessage(message): message is SvcWorkerSessionPingMessage;
```

Type guard for [SvcWorkerSessionPingMessage](../interfaces/SvcWorkerSessionPingMessage.md).

## Parameters

| Parameter | Type      | Description          |
| --------- | --------- | -------------------- |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerSessionPingMessage`

True if the message is a SvcWorkerSessionPingMessage, false otherwise
