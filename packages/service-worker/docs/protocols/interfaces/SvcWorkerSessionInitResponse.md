[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionInitResponse

# Interface: SvcWorkerSessionInitResponse

SESSION_INIT response (Service Worker -> Page via MessagePort).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-success"></a> `success` | `boolean` | - |
| <a id="property-suspended"></a> `suspended?` | `boolean` | Whether the service worker is currently in suspended state (circuit breaker engaged). Optional for backward compatibility with older service workers. |
| <a id="property-type"></a> `type` | `"V_SW_SESSION_INIT"` | - |
| <a id="property-version"></a> `version` | `string` | - |
