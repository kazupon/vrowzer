[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerControllerOptions

# Interface: SvcWorkerControllerOptions

[Service Worker Controller](SvcWorkerController.md) instance creation options

Use in [createSvcWorkerController](../functions/createSvcWorkerController.md) function.

## Extends

- `RegistrationOptions`

## Properties

| Property                                      | Type                          | Description                                                                                                                                                                                                                   | Inherited from                       |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| <a id="debug"></a> `debug?`                   | (...`data`) => `void`         | debug logger function                                                                                                                                                                                                         | -                                    |
| <a id="scope"></a> `scope?`                   | `string`                      | -                                                                                                                                                                                                                             | `RegistrationOptions.scope`          |
| <a id="scripturl"></a> `scriptURL`            | `string` \| `URL`             | The URL of the service worker script to register **See** [https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register) | -                                    |
| <a id="type"></a> `type?`                     | `WorkerType`                  | -                                                                                                                                                                                                                             | `RegistrationOptions.type`           |
| <a id="updateviacache"></a> `updateViaCache?` | `ServiceWorkerUpdateViaCache` | -                                                                                                                                                                                                                             | `RegistrationOptions.updateViaCache` |
| <a id="version"></a> `version`                | `string`                      | The version tag string to identify the service worker                                                                                                                                                                         | -                                    |
