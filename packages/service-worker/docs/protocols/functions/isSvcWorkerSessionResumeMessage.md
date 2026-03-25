[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / isSvcWorkerSessionResumeMessage

# Function: isSvcWorkerSessionResumeMessage()

```ts
function isSvcWorkerSessionResumeMessage(message): message is SvcWorkerSessionResumeMessage;
```

Type guard for resume messages.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerSessionResumeMessage`

True if the message is a resume message
