[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionPingMessage

# Function: createSvcWorkerSessionPingMessage()

```ts
function createSvcWorkerSessionPingMessage(id): SvcWorkerSessionPingMessage;
```

Create a [service worker 'V_SW_SESSION_PING' message](../interfaces/SvcWorkerSessionPingMessage.md).

## Parameters

| Parameter | Type     | Description                        |
| --------- | -------- | ---------------------------------- |
| `id`      | `string` | The unique ID for the ping message |

## Returns

[`SvcWorkerSessionPingMessage`](../interfaces/SvcWorkerSessionPingMessage.md)

The constructed [SvcWorkerSessionPingMessage](../interfaces/SvcWorkerSessionPingMessage.md)
