# Interface: SvcWorkerSessionTerminatedMessage

Terminated notification message (Service Worker -> Page via session MessagePort)

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerSessionTerminatedMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `reason` | [`SvcWorkerTerminatedReason`](/packages/service-worker/docs/protocols/type-aliases/SvcWorkerTerminatedReason.md) | The reason for termination |
| `type` | `typeof` [`V_SW_SESSION_TERMINATED`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_TERMINATED.md) |  |
