[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [worker](../index.md) / SvcWorkerOptions

# Interface: SvcWorkerOptions

Service Worker options for [createSvcWorker](../functions/createSvcWorker.md)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-debug"></a> `debug?` | \{ (...`data`): `void`; (...`data`): `void`; (...`data`): `void`; \} | Debug logger function |
| <a id="property-heartbeatinterval"></a> `heartbeatInterval?` | `number` | Heartbeat interval in milliseconds **Default** `30000` |
| <a id="property-sessiontimeout"></a> `sessionTimeout?` | `number` | Timeout after which a session is considered stale (no PONG received) **Default** `60000` |
| <a id="property-version"></a> `version` | `string` | The version of this service worker This is used to identify the service worker when communicating with SvcWorkerController |
