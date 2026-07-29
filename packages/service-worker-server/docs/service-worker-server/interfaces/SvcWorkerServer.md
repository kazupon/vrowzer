# Interface: SvcWorkerServer&lt;MessageData&gt;

The Server for service worker environment

This interface has like Node.js HTTP Server interfaces.
This will be used as server that runs within a Service Worker environment.

## Extends

- `Emittable`\<[`SvcWorkerServerEventMap`](/packages/service-worker-server/docs/service-worker-server/type-aliases/SvcWorkerServerEventMap.md)\<`MessageData`\>\>
- `Disposable`
- `AsyncDisposable`

## Signature

```ts
export interface SvcWorkerServer<MessageData = unknown> extends Emittable<SvcWorkerServerEventMap<MessageData>>, Disposable, AsyncDisposable
```

## Type Parameters

| Name | Description |
| --- | --- |
| `MessageData` = `unknown` | The type of the message data for the `connection` event. Defaults to `unknown`. |

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `state` _(readonly)_ | [`SvcWorkerServerState`](/packages/service-worker-server/docs/service-worker-server/type-aliases/SvcWorkerServerState.md) | The current state of the server |

## Methods

### address()

```ts
address(): URL | null;
```

Returns the bound service worker address

the address service worker script URL, or `null` if the server is not listening.

#### Returns

`URL | null` — The service worker script URL or `null`

***

### close()

```ts
close(cb?: (err?: Error) => void, stopConnectionListening?: boolean): SvcWorkerServer<MessageData>;
```

Stops the server from accepting new fetch event and close MessageChannel port connections

When it will be finished, the optional callback `fn` will be called, and trigger 'close' event.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `cb` | `(err?: Error) => void` | An optional callback function which will be called when the server is closed _(optional)_ |
| `stopConnectionListening` | `boolean` | If `true`, also stops listening for MessageChannel port connections too via [SvcWorkerServer.closeConnections](#method-closeconnections). Defaults to `false`. _(optional)_ |

#### Returns

[`SvcWorkerServer`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md)\<`MessageData`\> — The server instance

***

### closeConnections()

```ts
closeConnections(cb?: (err?: Error) => void): SvcWorkerServer<MessageData>;
```

Closes MessageChannel port connections connected to this server.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `cb` | `(err?: Error) => void` | An optional callback function which will be called when MessageChannel port connections are closed _(optional)_ |

#### Returns

[`SvcWorkerServer`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md)\<`MessageData`\> — The server instance

***

### getConnections()

```ts
getConnections(cb: (error: Error | null, count: number) => void): SvcWorkerServer<MessageData>;
```

Asynchronously get the number of concurrent MessageChannel port connections on the server.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `cb` | `(error: Error \| null, count: number) => void` |  |

#### Returns

[`SvcWorkerServer`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md)\<`MessageData`\>

***

### listen()

```ts
listen(options?: ListenOptions): SvcWorkerServer<MessageData>;
```

Start a server listening for service worker fetch events

When the service worker fetch event handler is bound, the 'listening' event will be emitted.
If `enableListenConnections` option is set to `true`, server will be started to listen MessageChannel connection too via [SvcWorkerServer.listenConnections](#method-listenconnections) internally.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`ListenOptions`](/packages/service-worker-server/docs/service-worker-server/interfaces/ListenOptions.md) | Options for listening _(optional)_ |

#### Returns

[`SvcWorkerServer`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md)\<`MessageData`\> — The server instance

#### Throws

- [`SvcWorkerServerError`](/packages/service-worker-server/docs/service-worker-server/classes/SvcWorkerServerError.md) — When the server is already listening or fetch handler is not set

***

### listenConnections()

```ts
listenConnections(): SvcWorkerServer<MessageData>;
```

Start a MessageChannel port connections listening with `message` events from clients.

#### Returns

[`SvcWorkerServer`](/packages/service-worker-server/docs/service-worker-server/interfaces/SvcWorkerServer.md)\<`MessageData`\> — The server instance

***

### setFetchHandler()

```ts
setFetchHandler(handler: (event: FetchEvent) => void): void;
```

Set a fetch event handler

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `handler` | `(event: FetchEvent) => void` | A function to handle fetch events |

#### Returns

`void`
