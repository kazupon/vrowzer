# Function: isSvcWorkerSessionResponse()

Type guard for [SvcWorkerSessionResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResponse.md).

## Signature

```ts
export function isSvcWorkerSessionResponse<T>(message: unknown): message is SvcWorkerSessionResponse<T>
```

## Type Parameters

| Name |
| --- |
| `T` |

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionResponse`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResponse.md)\<`T`\> — True if the message is a SvcWorkerSessionResponse, false otherwise
