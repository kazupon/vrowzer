# Function: safeMessagePort()

Create a safe MessagePort wrapper as an event emitter

The returned SafeMessagePort will automatically handle the closing of the `MessagePort` when disposed,
and it will also manage event listeners to prevent memory leaks.

The underlying `MessagePort` will be started automatically.

When `close()` is called, a `goodbye` message is sent to the remote side so that it can
also fire a `close` event and clean up resources.

## Signature

```ts
export function safeMessagePort<T = unknown>(port: MessagePort, options?: SafeMessagePortOptions): SafeMessagePortResult<T>
```

## Type Parameters

| Name | Description |
| --- | --- |
| `T` = `unknown` | Message data type |

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `port` | `MessagePort` | The MessagePort to wrap |
| `options` | [`SafeMessagePortOptions`](/packages/safe-port/docs/default/interfaces/SafeMessagePortOptions.md) | Optional configuration (heartbeat, etc.) _(optional)_ |

## Returns

[`SafeMessagePortResult`](/packages/safe-port/docs/default/type-aliases/SafeMessagePortResult.md)\<`T`\> — A [SafeMessagePort](/packages/safe-port/docs/default/interfaces/SafeMessagePort.md) that wraps the `MessagePort`

## Examples

```ts
const channel = new MessageChannel()
const port = safeMessagePort<{ greeting: string }>(channel.port1)

port.on('close', () => {
  console.log('port closed')
})

port.on('message', (event) => {
  console.log(event.data.greeting)  // type-safe
})

port.postMessage({ greeting: 'hello' })  // type-safe
```
