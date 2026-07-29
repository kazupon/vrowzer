# Function: isSvcWorkerSessionResumeMessage()

Type guard for resume messages.

## Signature

```ts
export function isSvcWorkerSessionResumeMessage(message: unknown): message is SvcWorkerSessionResumeMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionResumeMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeMessage.md) — True if the message is a resume message
