[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionGenericResponse

# Interface: SvcWorkerSessionGenericResponse\<T\>

Generic session response interface.

Used for all session-based request/response patterns including
circuit breaker and resume operations.

Response matching is done by the `id` field.

## Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `T`            | `unknown`    |

## Properties

| Property                       | Type      | Description                             |
| ------------------------------ | --------- | --------------------------------------- |
| <a id="data"></a> `data?`      | `T`       | Response data if successful             |
| <a id="error"></a> `error?`    | `string`  | Error message if failed                 |
| <a id="id"></a> `id`           | `string`  | The request ID for response matching    |
| <a id="success"></a> `success` | `boolean` | Whether the operation succeeded         |
| <a id="type"></a> `type`       | `string`  | The message type (same as request type) |
