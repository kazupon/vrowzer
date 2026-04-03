[**@vrowzer/safe-port**](../index.md)

***

[@vrowzer/safe-port](../index.md) / SafeMessagePortOptions

# Interface: SafeMessagePortOptions

Options for [safeMessagePort](../functions/safeMessagePort.md)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-heartbeat"></a> `heartbeat?` | `object` | Heartbeat configuration for detecting unresponsive remote port. When enabled, periodically sends ping messages and expects pong responses. If no pong is received within the timeout, fires a `close` event. |
| `heartbeat.interval?` | `number` | Interval in milliseconds between ping messages **Default** `1000` |
| `heartbeat.timeout?` | `number` | Timeout in milliseconds to wait for a pong response **Default** `3000` |
