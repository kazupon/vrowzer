# Function: createSvcWorkerSessionPongMessage()

Create a [service worker 'V_SW_SESSION_PONG' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPongMessage.md).

## Signature

```ts
export function createSvcWorkerSessionPongMessage(id: string): SvcWorkerSessionPongMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | The ID of the PING message to respond to |

## Returns

[`SvcWorkerSessionPongMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPongMessage.md) — The constructed SvcWorkerSessionPongMessage
