[**@vrowser/service-worker**](../index.md)

---

[@vrowser/service-worker](../index.md) / controller

# controller

Service Worker Controller

## Features

- Defines service worker version tag and verifies via service worker messaging.
- Handles the below status combination service worker on registration:
  - `registration.installing`
  - `registration.waiting`
  - `registration.active`

### Optional policy:

1. If any waiting exists, always request `skipWaiting` (aggressive).
2. If controller does not switch (expected is active but not controller), suggest reload via callback.

## Behavior

- Returns immediately if expected service worker is already the controller.
- Returns when expected service worker becomes active, even if not yet controlling the page.
  (For service workers that don't call `clients.claim()`, reload is needed to gain control)
- Calls [reloadSuggested](type-aliases/SvcWorkerControllerEventMap.md#reloadsuggested) when expected is active but not controller.

## Service worker requirements

- Possible to handle the service worker message protocols.
- Responds to `{ type: 'V_SW_VERSION' }` using `MessageChannel` port -> {version}
- Accepts `{ type: 'V_SW_SKIP_WAITING' }` -> `self.skipWaiting()`
- (Optional) in activate: `event.waitUntil(self.clients.claim())` - enables immediate control

The above requirements can be met by using a separately provided module within your service worker.

## Functions

| Function                                                            | Description                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [createSvcWorkerController](functions/createSvcWorkerController.md) | Create a [Service worker controller](interfaces/SvcWorkerController.md) instance. |

## Classes

| Class                                                           | Description                     |
| --------------------------------------------------------------- | ------------------------------- |
| [SvcWorkerControllerError](classes/SvcWorkerControllerError.md) | Service worker controller error |

## Interfaces

| Interface                                                                        | Description                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [ReloadSuggestInfo](interfaces/ReloadSuggestInfo.md)                             | Reload suggest information for service worker                                            |
| [StateChangeInfo](interfaces/StateChangeInfo.md)                                 | [Service Worker Controller](interfaces/SvcWorkerController.md) state change information  |
| [SvcWorkerController](interfaces/SvcWorkerController.md)                         | Service worker controller                                                                |
| [SvcWorkerControllerOptions](interfaces/SvcWorkerControllerOptions.md)           | [Service Worker Controller](interfaces/SvcWorkerController.md) instance creation options |
| [SvcWorkerControllerReadyOptions](interfaces/SvcWorkerControllerReadyOptions.md) | An options for SvcWorkerController.re \| Service Worker Controller                       |

## Type Aliases

| Type Alias                                                                 | Description                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [ReloadSuggestReason](type-aliases/ReloadSuggestReason.md)                 | Reload suggest reason                                                  |
| [SkipWaitingPolicy](type-aliases/SkipWaitingPolicy.md)                     | Skip waiting policy type                                               |
| [SvcWorkerControllerEventMap](type-aliases/SvcWorkerControllerEventMap.md) | Event map for [SvcWorkerController](interfaces/SvcWorkerController.md) |
| [SvcWorkerControllerState](type-aliases/SvcWorkerControllerState.md)       | [Service Worker Controller](interfaces/SvcWorkerController.md) state   |
