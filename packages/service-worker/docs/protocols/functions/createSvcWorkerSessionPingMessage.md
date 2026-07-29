# Function: createSvcWorkerSessionPingMessage()

Create a [service worker 'V_SW_SESSION_PING' message](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md).

## Signature

```ts
export function createSvcWorkerSessionPingMessage(id: string): SvcWorkerSessionPingMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | The unique ID for the ping message |

## Returns

[`SvcWorkerSessionPingMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md) — The constructed [SvcWorkerSessionPingMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md)
