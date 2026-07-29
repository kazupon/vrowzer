# Function: isSvcWorkerSessionInitResponse()

Type guard for [SvcWorkerSessionInitResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md).

## Signature

```ts
export function isSvcWorkerSessionInitResponse(message: unknown): message is SvcWorkerSessionInitResponse
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionInitResponse`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md) — True if the message is a SvcWorkerSessionInitResponse, false otherwise
