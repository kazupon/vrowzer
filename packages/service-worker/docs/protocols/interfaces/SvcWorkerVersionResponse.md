# Interface: SvcWorkerVersionResponse

VERSION response message (Service Worker -> Page via MessagePort).

## Extends

- [`SvcWorkerMessageBase`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerMessageBase.md)

## Signature

```ts
export interface SvcWorkerVersionResponse extends SvcWorkerMessageBase
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `type` | `typeof` [`V_SW_VERSION`](/packages/service-worker/docs/protocols/variables/V_SW_VERSION.md) |  |
| `version` | `string` |  |
