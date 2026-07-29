# controller

Service Worker Controller

This module provides a controller for managing Service Worker lifecycle on the page side.

## Features
- Version verification via service worker messaging
- Handles registration states: `installing`, `waiting`, `active`
- Singleton pattern: One controller instance per scriptURL + version combination
- Session management with MessagePort-based bidirectional communication
- Circuit breaker: suspend (soft kill) and resume capabilities

### Skip Waiting Policy
- `'strict'`: Request `skipWaiting` only if waiting/installing matches expected version
- `'force'`: If `registration.waiting` exists, always request `skipWaiting`

## Behavior
- Returns immediately if expected service worker is already the controller
- Returns when expected service worker becomes active, even if not yet controlling the page
- Emits [reloadSuggested](/packages/service-worker/docs/controller/type-aliases/SvcWorkerControllerEventMap.md#property-reloadsuggested) when expected is active but not controller

## Service Worker Requirements
The service worker must handle the following message protocols:
- `V_SW_VERSION`: Respond with version via MessagePort
- `V_SW_SKIP_WAITING`: Call `self.skipWaiting()`
- `V_SW_SESSION_INIT`: Establish session (for circuit breaker support)
- (Optional) `clients.claim()` in activate event for immediate control

These requirements are satisfied by using the `worker` module.

## Functions

| Function | Description |
| ------ | ------ |
| [createSvcWorkerController](/packages/service-worker/docs/controller/functions/createSvcWorkerController.md) | Create a [Service worker controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) instance. |

## Classes

| Class | Description |
| ------ | ------ |
| [SvcWorkerControllerError](/packages/service-worker/docs/controller/classes/SvcWorkerControllerError.md) | Service worker controller error. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ReloadSuggestInfo](/packages/service-worker/docs/controller/interfaces/ReloadSuggestInfo.md) | Reload suggest information for service worker. |
| [StateChangeInfo](/packages/service-worker/docs/controller/interfaces/StateChangeInfo.md) | [Service Worker Controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) state change information. |
| [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) | Service worker controller. |
| [SvcWorkerControllerOptions](/packages/service-worker/docs/controller/interfaces/SvcWorkerControllerOptions.md) | [Service Worker Controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) instance creation options. |
| [SvcWorkerControllerReadyOptions](/packages/service-worker/docs/controller/interfaces/SvcWorkerControllerReadyOptions.md) | An options for Service Worker Controller. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ReloadSuggestReason](/packages/service-worker/docs/controller/type-aliases/ReloadSuggestReason.md) | Reload suggest reason. |
| [SkipWaitingPolicy](/packages/service-worker/docs/controller/type-aliases/SkipWaitingPolicy.md) | Skip waiting policy. |
| [SvcWorkerControllerEventMap](/packages/service-worker/docs/controller/type-aliases/SvcWorkerControllerEventMap.md) | Event map for [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md). |
| [SvcWorkerControllerState](/packages/service-worker/docs/controller/type-aliases/SvcWorkerControllerState.md) | [Service Worker Controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) state. |

