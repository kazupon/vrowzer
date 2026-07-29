# Interface: SvcWorkerSessionPingMessage

PING message (Service Worker -> Page via session MessagePort).

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerSessionPingMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` |  |
| `type` | `typeof` [`V_SW_SESSION_PING`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_PING.md) |  |
