# Function: isSvcWorkerSessionTerminatedMessage()

Type guard for [SvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md).

## Signature

```ts
export function isSvcWorkerSessionTerminatedMessage(message: unknown): message is SvcWorkerSessionTerminatedMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionTerminatedMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md) — True if the message is a SvcWorkerSessionTerminatedMessage
