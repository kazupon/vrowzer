[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / isSvcWorkerSessionCircuitBreakerMessage

# Function: isSvcWorkerSessionCircuitBreakerMessage()

```ts
function isSvcWorkerSessionCircuitBreakerMessage(message): message is SvcWorkerSessionCircuitBreakerMessage;
```

Type guard for circuit breaker messages

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `unknown` | The message to check |

## Returns

`message is SvcWorkerSessionCircuitBreakerMessage`

True if the message is a circuit breaker message
