# Function: createSvcWorkerSessionTerminatedMessage()

Create a [SvcWorkerSessionTerminatedMessage](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md).

## Signature

```ts
export function createSvcWorkerSessionTerminatedMessage(reason: SvcWorkerTerminatedReason): SvcWorkerSessionTerminatedMessage
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `reason` | [`SvcWorkerTerminatedReason`](/packages/service-worker/docs/protocols/type-aliases/SvcWorkerTerminatedReason.md) | The reason for termination |

## Returns

[`SvcWorkerSessionTerminatedMessage`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionTerminatedMessage.md) — The constructed message
