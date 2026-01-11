[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [worker](../index.md) / SvcWorkerOptions

# Interface: SvcWorkerOptions

Service Worker options for [createSvcWorker](../functions/createSvcWorker.md)

## Properties

| Property                                            | Type                  | Description                                                                                                                |
| --------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| <a id="debug"></a> `debug?`                         | (...`data`) => `void` | Debug logger function                                                                                                      |
| <a id="heartbeatinterval"></a> `heartbeatInterval?` | `number`              | Heartbeat interval in milliseconds **Default** `30000`                                                                     |
| <a id="sessiontimeout"></a> `sessionTimeout?`       | `number`              | Timeout after which a session is considered stale (no PONG received) **Default** `60000`                                   |
| <a id="version"></a> `version`                      | `string`              | The version of this service worker This is used to identify the service worker when communicating with SvcWorkerController |
