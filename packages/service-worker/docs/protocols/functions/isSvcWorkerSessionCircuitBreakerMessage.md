# Function: isSvcWorkerSessionCircuitBreakerMessage()

Type guard for circuit breaker messages

## Signature

```ts
export function isSvcWorkerSessionCircuitBreakerMessage(message: unknown): message is SvcWorkerSessionCircuitBreakerMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `unknown` | The message to check |

## Returns

`message` `is` [`SvcWorkerSessionCircuitBreakerMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerMessage.md) — True if the message is a circuit breaker message
