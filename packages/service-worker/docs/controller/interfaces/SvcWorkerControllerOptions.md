[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerControllerOptions

# Interface: SvcWorkerControllerOptions

[Service Worker Controller](SvcWorkerController.md) instance creation options.

Use in [createSvcWorkerController](../functions/createSvcWorkerController.md) function.

## Extends

- `RegistrationOptions`

## Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| <a id="property-debug"></a> `debug?` | \{ (...`data`): `void`; (...`data`): `void`; (...`data`): `void`; \} | debug logger function. | - |
| <a id="property-scope"></a> `scope?` | `string` | - | `RegistrationOptions.scope` |
| <a id="property-scripturl"></a> `scriptURL` | `URL` | The URL of the service worker script to register. Must be a URL object for bundler static analysis compatibility. **Example** `createSvcWorkerController({ scriptURL: new URL('./sw.js', import.meta.url), version: 'v1' })` **See** https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register | - |
| <a id="property-type"></a> `type?` | `WorkerType` | - | `RegistrationOptions.type` |
| <a id="property-updateviacache"></a> `updateViaCache?` | `ServiceWorkerUpdateViaCache` | - | `RegistrationOptions.updateViaCache` |
| <a id="property-version"></a> `version` | `string` | The version tag string to identify the service worker. | - |
