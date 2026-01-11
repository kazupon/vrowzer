[**@vrowser/service-worker**](../index.md)

---

[@vrowser/service-worker](../index.md) / admin

# admin

Service Worker Administration API

Provides management functions for service workers registered via SvcWorkerController.
Implements kill switch / circuit breaker pattern for fail-safe control.

This module does not bypass navigator.serviceWorker APIs directly.
It only operates on service workers managed by SvcWorkerController.

## Functions

| Function                                                              | Description                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [disposeAllControllers](functions/disposeAllControllers.md)           | Dispose all registered controllers                                          |
| [getAllControllers](functions/getAllControllers.md)                   | Get all registered service worker controllers                               |
| [getController](functions/getController.md)                           | Get a controller by its script URL and version                              |
| [resumeAllServiceWorkers](functions/resumeAllServiceWorkers.md)       | Resume all suspended service workers.                                       |
| [resumeServiceWorker](functions/resumeServiceWorker.md)               | Resume a specific suspended service worker.                                 |
| [suspendAllServiceWorkers](functions/suspendAllServiceWorkers.md)     | Suspend all registered service workers (soft kill / circuit breaker)        |
| [suspendServiceWorker](functions/suspendServiceWorker.md)             | Suspend a specific service worker (soft kill / circuit breaker)             |
| [terminateAllServiceWorkers](functions/terminateAllServiceWorkers.md) | Terminate all registered service workers (hard kill / circuit breaker trip) |
| [terminateServiceWorker](functions/terminateServiceWorker.md)         | Terminate a specific service worker (hard kill / circuit breaker trip).     |

## Interfaces

| Interface                                          | Description                      |
| -------------------------------------------------- | -------------------------------- |
| [SuspendOptions](interfaces/SuspendOptions.md)     | Options for suspend operations   |
| [TerminateOptions](interfaces/TerminateOptions.md) | Options for terminate operations |
