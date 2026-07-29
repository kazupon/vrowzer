# worker

Service Worker Module

> [!IMPORTANT]
> This module is intended for use within service workers.
> It cannot be used in regular JavaScript applications.

This module provides a Proxy-based wrapper for Service Workers that:
- Transparently passes through all native ServiceWorkerGlobalScope APIs
- Handles protocol messages defined in `protocols` module

## Features
- Service Worker version management
- Optional execution of `skipWaiting`
- Session management with MessagePort-based communication
- Circuit breaker (suspend/resume) for emergency shutdown
- Heartbeat monitoring and stale session cleanup

## Usage
```ts
const sw = createSvcWorker(self, { version: '1.0.0' })

// Native APIs work transparently
sw.addEventListener('fetch', (event) => {
  // Check suspended flag for circuit breaker
  if (sw.suspended) {
    event.respondWith(fetch(event.request))
    return
  }
  // Normal handling...
})

// Extended properties
console.log(sw.version)      // '1.0.0'
console.log(sw.suspended)    // false
console.log(sw.sessionCount) // 0
```

## Functions

| Function | Description |
| ------ | ------ |
| [createSvcWorker](/packages/service-worker/docs/worker/functions/createSvcWorker.md) | Create a Service Worker wrapper with Proxy-based transparent access |

## Classes

| Class | Description |
| ------ | ------ |
| [SvcWorkerError](/packages/service-worker/docs/worker/classes/SvcWorkerError.md) | Service Worker Error |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [SvcWorker](/packages/service-worker/docs/worker/interfaces/SvcWorker.md) | Service Worker interface that extends ServiceWorkerGlobalScope |
| [SvcWorkerOptions](/packages/service-worker/docs/worker/interfaces/SvcWorkerOptions.md) | Service Worker options for [createSvcWorker](/packages/service-worker/docs/worker/functions/createSvcWorker.md) |

