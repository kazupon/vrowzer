# Interface: SvcWorkerServerOptions

The [SvcWorkerServer](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md) constructor options

## Extends

- `SvcWorkerOptions`

## Signature

```ts
export interface SvcWorkerServerOptions extends SvcWorkerOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `claimOnActivate` _(optional)_ | `boolean` | Automatically call `clients.claim()` on `activate` event. |
