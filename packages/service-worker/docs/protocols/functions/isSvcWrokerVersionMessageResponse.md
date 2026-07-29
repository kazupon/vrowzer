# Function: isSvcWrokerVersionMessageResponse()

Type guard for [SvcWorkerVersionMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionMessage.md).

## Signature

```ts
export function isSvcWrokerVersionMessageResponse(message: unknown): message is SvcWorkerVersionResponse
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerVersionResponse`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerVersionResponse.md) — True if the message is a SvcWorkerVersionMessage, false otherwise
