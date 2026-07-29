# Interface: ListenOptions

Options for the [SvcWorkerServer.listen](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md#method-listen) method

## Signature

```ts
export interface ListenOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `activateTimeout` _(optional)_ | `number` | Timeout in milliseconds for waiting for the activate event. If the timeout is exceeded, an 'error' event is emitted. **Default:** `30000 (30 seconds)` |
| `enableListenConnections` _(optional)_ | `boolean` | Enable listening for MessageChannel port connections. If set to true, the server will accept connections via `message` events from clients. **Default:** `false` |
