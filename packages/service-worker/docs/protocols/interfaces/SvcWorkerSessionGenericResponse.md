# Interface: SvcWorkerSessionGenericResponse&lt;T&gt;

Generic session response interface.

Used for all session-based request/response patterns including
circuit breaker and resume operations.

Response matching is done by the `id` field.

## Signature

```ts
export interface SvcWorkerSessionGenericResponse<T = unknown>
```

## Type Parameters

| Name |
| --- |
| `T` = `unknown` |

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `data` _(optional)_ | `T` | Response data if successful |
| `error` _(optional)_ | `string` | Error message if failed |
| `id` | `string` | The request ID for response matching |
| `success` | `boolean` | Whether the operation succeeded |
| `type` | `string` | The message type (same as request type) |
