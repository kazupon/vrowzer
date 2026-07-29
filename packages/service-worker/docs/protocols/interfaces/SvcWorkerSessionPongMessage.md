# Interface: SvcWorkerSessionPongMessage

PONG response (Page -> Service Worker via session MessagePort).

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerSessionPongMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` |  |
| `type` | `typeof` [`V_SW_SESSION_PONG`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_PONG.md) |  |
