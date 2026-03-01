[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionTerminatedMessage

# Function: createSvcWorkerSessionTerminatedMessage()

```ts
function createSvcWorkerSessionTerminatedMessage(reason): SvcWorkerSessionTerminatedMessage;
```

Create a [SvcWorkerSessionTerminatedMessage](../interfaces/SvcWorkerSessionTerminatedMessage.md).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `reason` | `"unregister"` | The reason for termination |

## Returns

[`SvcWorkerSessionTerminatedMessage`](../interfaces/SvcWorkerSessionTerminatedMessage.md)

The constructed message
