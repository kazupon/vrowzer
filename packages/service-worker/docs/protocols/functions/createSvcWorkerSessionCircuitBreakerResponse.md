[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionCircuitBreakerResponse

# Function: createSvcWorkerSessionCircuitBreakerResponse()

```ts
function createSvcWorkerSessionCircuitBreakerResponse<T>(
   id,
   success,
value): SvcWorkerSessionGenericResponse<T>;
```

Create a circuit breaker response message

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

The constructed circuit breaker response message
