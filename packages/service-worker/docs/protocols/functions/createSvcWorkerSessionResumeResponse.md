[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionResumeResponse

# Function: createSvcWorkerSessionResumeResponse()

```ts
function createSvcWorkerSessionResumeResponse<T>(
   id,
   success,
value): SvcWorkerSessionGenericResponse<T>;
```

Create a resume response message.

## Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `T`            | `unknown`    |

## Parameters

| Parameter      | Type                                    | Description                     |
| -------------- | --------------------------------------- | ------------------------------- |
| `id`           | `string`                                | The request ID                  |
| `success`      | `boolean`                               | Whether the operation succeeded |
| `value`        | \{ `data?`: `T`; `error?`: `string`; \} | Optional data or error message  |
| `value.data?`  | `T`                                     | -                               |
| `value.error?` | `string`                                | -                               |

## Returns

[`SvcWorkerSessionGenericResponse`](../interfaces/SvcWorkerSessionGenericResponse.md)\<`T`\>

The constructed resume response message
