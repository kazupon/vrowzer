# Function: createSvcWorkerSessionResumeResponse()

Create a resume response message.

## Signature

```ts
export function createSvcWorkerSessionResumeResponse<T = unknown>(id: string, success: boolean, value: { data?: T; error?: string } = {}): SvcWorkerSessionGenericResponse<T>
```

## Type Parameters

| Name |
| --- |
| `T` = `unknown` |

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | The request ID |
| `success` | `boolean` | Whether the operation succeeded |
| `value` | `{ data?: T; error?: string }` | Optional data or error message _(optional, default: {})_ |
| `value.data?` | `T` | _optional_ |
| `value.error?` | `string` | _optional_ |

## Returns

[`SvcWorkerSessionGenericResponse`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionGenericResponse.md)\<`T`\> — The constructed resume response message
