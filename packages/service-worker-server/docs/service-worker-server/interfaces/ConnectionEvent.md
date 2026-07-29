# Interface: ConnectionEvent&lt;T&gt;

Connection event payload for MessageChannel connections.

This interface represents a connection event that is emitted when a client
sends a message with MessagePorts (typically for establishing a MessageChannel connection).

## Signature

```ts
export interface ConnectionEvent<T = unknown>
```

## Type Parameters

| Name | Description |
| --- | --- |
| `T` = `unknown` | The type of the message data. Defaults to `unknown`. |

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `clientId` _(optional, readonly)_ | `string` | The client ID if the source is a Client. |
| `data` _(readonly)_ | `T` | The message data with type safety. |
| `ports` _(readonly)_ | `readonly MessagePort[]` | The MessagePorts received from the client. |
| `source` _(readonly)_ | `Client \| ServiceWorker \| MessagePort \| null` | The source of the message (Client, ServiceWorker, or MessagePort). |

## Examples

```ts
interface MyMessage {
  type: 'greeting' | 'farewell'
  payload: string
}

const server = createSvcWorkerServer<MyMessage>(self, options)
server.on('connection', (event) => {
  // event.data is typed as MyMessage
  console.log(event.data.type, event.data.payload)
  // Access the MessagePorts
  console.log(event.ports)
})
```
