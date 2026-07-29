# Function: isSvcWorkerSessionPingMessage()

Type guard for [SvcWorkerSessionPingMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md).

## Signature

```ts
export function isSvcWorkerSessionPingMessage(message: unknown): message is SvcWorkerSessionPingMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionPingMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionPingMessage.md) — True if the message is a SvcWorkerSessionPingMessage, false otherwise
