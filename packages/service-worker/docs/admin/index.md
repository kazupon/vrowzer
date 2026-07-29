# admin

Service Worker Administration API

Provides management functions for service workers registered via [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md).
Implements kill switch / circuit breaker pattern for fail-safe control.

This module does not bypass `navigator.serviceWorker` APIs directly.
It only operates on service workers managed by `SvcWorkerController`.

## Functions

| Function | Description |
| ------ | ------ |
| [disposeAllControllers](/packages/service-worker/docs/admin/functions/disposeAllControllers.md) | Dispose all registered controllers. |
| [getAllControllers](/packages/service-worker/docs/admin/functions/getAllControllers.md) | Get all registered service worker controllers. |
| [getController](/packages/service-worker/docs/admin/functions/getController.md) | Get a controller by its script URL and version. |
| [resumeAllServiceWorkers](/packages/service-worker/docs/admin/functions/resumeAllServiceWorkers.md) | Resume all suspended service workers. |
| [resumeServiceWorker](/packages/service-worker/docs/admin/functions/resumeServiceWorker.md) | Resume a specific suspended service worker. |
| [suspendAllServiceWorkers](/packages/service-worker/docs/admin/functions/suspendAllServiceWorkers.md) | Suspend all registered service workers (soft kill / circuit breaker). |
| [suspendServiceWorker](/packages/service-worker/docs/admin/functions/suspendServiceWorker.md) | Suspend a specific service worker (soft kill / circuit breaker). |
| [terminateAllServiceWorkers](/packages/service-worker/docs/admin/functions/terminateAllServiceWorkers.md) | Terminate all registered service workers (hard kill / circuit breaker trip). |
| [terminateServiceWorker](/packages/service-worker/docs/admin/functions/terminateServiceWorker.md) | Terminate a specific service worker (hard kill / circuit breaker trip). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [SuspendOptions](/packages/service-worker/docs/admin/interfaces/SuspendOptions.md) | Options for suspend operations. |
| [TerminateOptions](/packages/service-worker/docs/admin/interfaces/TerminateOptions.md) | Options for terminate operations. |

