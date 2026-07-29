# Interface: SafeMessagePortOptions

Options for [safeMessagePort](/packages/safe-port/docs/default/functions/safeMessagePort.md)

## Signature

```ts
export interface SafeMessagePortOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `heartbeat` _(optional)_ | `{ interval?: number; timeout?: number }` | Heartbeat configuration for detecting unresponsive remote port. When enabled, periodically sends ping messages and expects pong responses. If no pong is received within the timeout, fires a `close` event. |
