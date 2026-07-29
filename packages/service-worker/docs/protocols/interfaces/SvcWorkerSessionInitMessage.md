# Interface: SvcWorkerSessionInitMessage

SESSION_INIT message (Page -> Service Worker).
Sent with a MessagePort to establish a persistent session.

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerSessionInitMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `type` | `typeof` [`V_SW_SESSION_INIT`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_INIT.md) |  |
