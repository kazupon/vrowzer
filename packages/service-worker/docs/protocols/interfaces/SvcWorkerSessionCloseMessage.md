# Interface: SvcWorkerSessionCloseMessage

SESSION_CLOSE message (Page -> Service Worker via session MessagePort).

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerSessionCloseMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `type` | `typeof` [`V_SW_SESSION_CLOSE`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_CLOSE.md) |  |
