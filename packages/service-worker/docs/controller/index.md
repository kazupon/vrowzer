[**@vrowzer/service-worker**](../index.md)

***

[@vrowzer/service-worker](../index.md) / controller

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
- Emits [reloadSuggested](type-aliases/SvcWorkerControllerEventMap.md#property-reloadsuggested) when expected is active but not controller

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
| [createSvcWorkerController](functions/createSvcWorkerController.md) | Create a [Service worker controller](interfaces/SvcWorkerController.md) instance. |

## Classes

| Class | Description |
| ------ | ------ |
| [SvcWorkerControllerError](classes/SvcWorkerControllerError.md) | Service worker controller error. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [ReloadSuggestInfo](interfaces/ReloadSuggestInfo.md) | Reload suggest information for service worker. |
| [StateChangeInfo](interfaces/StateChangeInfo.md) | [Service Worker Controller](interfaces/SvcWorkerController.md) state change information. |
| [SvcWorkerController](interfaces/SvcWorkerController.md) | Service worker controller. |
| [SvcWorkerControllerOptions](interfaces/SvcWorkerControllerOptions.md) | [Service Worker Controller](interfaces/SvcWorkerController.md) instance creation options. |
| [SvcWorkerControllerReadyOptions](interfaces/SvcWorkerControllerReadyOptions.md) | An options for SvcWorkerController.re \| Service Worker Controller. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ReloadSuggestReason](type-aliases/ReloadSuggestReason.md) | Reload suggest reason. |
| [SkipWaitingPolicy](type-aliases/SkipWaitingPolicy.md) | Skip waiting policy. |
| [SvcWorkerControllerEventMap](type-aliases/SvcWorkerControllerEventMap.md) | Event map for [SvcWorkerController](interfaces/SvcWorkerController.md). |
| [SvcWorkerControllerState](type-aliases/SvcWorkerControllerState.md) | [Service Worker Controller](interfaces/SvcWorkerController.md) state. |
