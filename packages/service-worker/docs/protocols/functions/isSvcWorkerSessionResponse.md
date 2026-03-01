[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / isSvcWorkerSessionResponse

# Function: isSvcWorkerSessionResponse()

```ts
function isSvcWorkerSessionResponse<T>(message): message is SvcWorkerSessionResponse<T>;
```

Type guard for [SvcWorkerSessionResponse](../interfaces/SvcWorkerSessionResponse.md).

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerSessionResponse<T>`

True if the message is a SvcWorkerSessionResponse, false otherwise
