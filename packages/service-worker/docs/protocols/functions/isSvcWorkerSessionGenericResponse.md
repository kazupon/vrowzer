[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / isSvcWorkerSessionGenericResponse

# Function: isSvcWorkerSessionGenericResponse()

```ts
function isSvcWorkerSessionGenericResponse<T>(message): message is SvcWorkerSessionGenericResponse<T>;
```

Type guard for generic session response

Matches any response with id and success fields.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerSessionGenericResponse<T>`

True if the message is a generic session response
