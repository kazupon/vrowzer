[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionPongMessage

# Function: createSvcWorkerSessionPongMessage()

```ts
function createSvcWorkerSessionPongMessage(id): SvcWorkerSessionPongMessage;
```

Create a [service worker 'VROWSER_SW_SESSION_PONG' message](../interfaces/SvcWorkerSessionPongMessage.md)

## Parameters

| Parameter | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `id`      | `string` | The ID of the PING message to respond to |

## Returns

[`SvcWorkerSessionPongMessage`](../interfaces/SvcWorkerSessionPongMessage.md)

The constructed SvcWorkerSessionPongMessage
