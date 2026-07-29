# Interface: SvcWorkerOptions

Service Worker options for [createSvcWorker](/packages/service-worker/docs/worker/functions/createSvcWorker.md)

## Signature

```ts
export interface SvcWorkerOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `debug` _(optional)_ | `Console['debug']` | Debug logger function |
| `heartbeatInterval` _(optional)_ | `number` | Heartbeat interval in milliseconds **Default:** `30000` |
| `sessionTimeout` _(optional)_ | `number` | Timeout after which a session is considered stale (no PONG received) **Default:** `60000` |
| `version` | `string` | The version of this service worker This is used to identify the service worker when communicating with [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) |
