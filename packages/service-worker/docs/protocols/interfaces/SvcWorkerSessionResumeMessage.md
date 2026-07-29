# Interface: SvcWorkerSessionResumeMessage

Resume message sent from controller to service worker.

Used to restore functionality after a suspend operation.

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerSessionResumeMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Request ID for response matching |
| `type` | `typeof` [`V_SW_SESSION_RESUME`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_RESUME.md) |  |
