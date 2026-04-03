[**@vrowzer/safe-port**](../index.md)

***

[@vrowzer/safe-port](../index.md) / safeMessagePort

# Function: safeMessagePort()

```ts
function safeMessagePort<T>(port, options?): SafeMessagePortResult<T>;
```

Create a safe MessagePort wrapper as an Emittable \| event emitter

The returned SafeMessagePort will automatically handle the closing of the `MessagePort` when disposed,
and it will also manage event listeners to prevent memory leaks.

The underlying `MessagePort` will be started automatically.

When `close()` is called, a `goodbye` message is sent to the remote side so that it can
also fire a `close` event and clean up resources.

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | `unknown` | Message data type |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `port` | `MessagePort` | The MessagePort to wrap |
| `options?` | [`SafeMessagePortOptions`](../interfaces/SafeMessagePortOptions.md) | Optional configuration (heartbeat, etc.) |

## Returns

[`SafeMessagePortResult`](../type-aliases/SafeMessagePortResult.md)\<`T`\>

A [SafeMessagePort](../interfaces/SafeMessagePort.md) that wraps the `MessagePort`

## Example

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
