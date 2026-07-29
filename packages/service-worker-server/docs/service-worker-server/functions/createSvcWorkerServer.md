# Function: createSvcWorkerServer()

Create a [Service worker server](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md) instance.

## Signature

```ts
export function createSvcWorkerServer<MessageData = unknown>(self: ServiceWorkerGlobalScope, options: SvcWorkerServerOptions): SvcWorkerServer<MessageData>
```

## Type Parameters

| Name | Description |
| --- | --- |
| `MessageData` = `unknown` | The type of the message data for the `connection` event. Defaults to `unknown`. |

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `self` | `ServiceWorkerGlobalScope` | The ServiceWorkerGlobalScope instance (typically `self` in a service worker) |
| `options` | [`SvcWorkerServerOptions`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServerOptions.md) | [Service worker server options](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServerOptions.md) |

## Returns

[`SvcWorkerServer`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md)\<`MessageData`\>

## Examples

```ts
interface MyMessage {
  type: 'greeting' | 'farewell'
  payload: string
}

const server = createSvcWorkerServer<MyMessage>(self, { version: '1.0.0' })
server.on('connection', (event) => {
  // event.data is typed as MyMessage
  console.log(event.data.type, event.data.payload)
  // Access the MessagePorts
  console.log(event.ports)
  // Access client ID if available
  console.log(event.clientId)
})
```
