[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / isSvcWrokerVersionMessageResponse

# Function: isSvcWrokerVersionMessageResponse()

```ts
function isSvcWrokerVersionMessageResponse(message): message is SvcWorkerVersionResponse;
```

Type guard for [SvcWorkerVersionMessage](../interfaces/SvcWorkerVersionMessage.md).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerVersionResponse`

True if the message is a SvcWorkerVersionMessage, false otherwise
