# Function: isSvcWorkerSessionGenericResponse()

Type guard for generic session response

Matches any response with id and success fields.

## Signature

```ts
export function isSvcWorkerSessionGenericResponse<T = unknown>(message: unknown): message is SvcWorkerSessionGenericResponse<T>
```

## Type Parameters

| Name |
| --- |
| `T` = `unknown` |

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionGenericResponse`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionGenericResponse.md)\<`T`\> — True if the message is a generic session response
