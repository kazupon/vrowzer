# Interface: SvcWorkerControllerOptions

[Service Worker Controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) instance creation options.

Use in [createSvcWorkerController](/packages/service-worker/docs/controller/functions/createSvcWorkerController.md) function.

## Extends

- `RegistrationOptions`

## Signature

```ts
export interface SvcWorkerControllerOptions extends RegistrationOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `debug` _(optional)_ | `Console['debug']` | debug logger function. |
| `scriptURL` | `URL` | The URL of the service worker script to register. Must be a URL object for bundler static analysis compatibility. |
| `version` | `string` | The version tag string to identify the service worker. |
