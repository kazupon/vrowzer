# Interface: SvcWorkerVersionMessage

VERSION request message (Page -> Service Worker).

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerVersionMessage extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `type` | `typeof` [`V_SW_VERSION`](/packages/service-worker/docs/protocols/variables/V_SW_VERSION.md) |  |
