# Type Alias: SvcWorkerServerEventMap&lt;MessageData&gt;

Event map for [SvcWorkerServer](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md).

This type defines the payload types for each event.

## Signature

```ts
export type SvcWorkerServerEventMap<MessageData = unknown> = { listening: void; connection: ConnectionEvent<MessageData>; close: void; error: Error }
```

## Type Parameters

| Name | Description |
| --- | --- |
| `MessageData` = `unknown` | The type of the message data for the `connection` event. Defaults to `unknown`. |

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `close` | `void` | Emitted when the server is closed. |
| `connection` | [`ConnectionEvent`](/packages/service-worker-server/docs/service-worker-server/interfaces/ConnectionEvent.md)\<`MessageData`\> | Emitted when a client connects via MessageChannel. This event is fired only when the message contains MessagePorts. |
| `error` | `Error` | Emitted when an error occurs. |
| `listening` | `void` | Emitted when the server starts listening for fetch events. |
