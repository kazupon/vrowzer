[**@vrowser/service-worker**](../index.md)

---

[@vrowser/service-worker](../index.md) / worker

# worker

Service Worker Module

> [!IMPORTANT]
> This module is intended for use within service workers.
> It cannot be used in regular JavaScript applications.

This module provides a Proxy-based wrapper for Service Workers that:

- Transparently accesses all native ServiceWorkerGlobalScope APIs
- Handles protocol messages defined in module:protocols

## Features

- Service Worker version management
- Optional execution of `skipWaiting`

## Usage

```typescript
const sw = createSvcWorker(self, { version: '1.0.0' })

// Native APIs work transparently
sw.addEventListener('fetch', (event) => { ... })

// Extended properties
console.log(sw.version)
```

## Functions

| Function                                        | Description                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| [createSvcWorker](functions/createSvcWorker.md) | Create a Service Worker wrapper with Proxy-based transparent access |

## Classes

| Class                                       | Description          |
| ------------------------------------------- | -------------------- |
| [SvcWorkerError](classes/SvcWorkerError.md) | Service Worker Error |

## Interfaces

| Interface                                          | Description                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| [SvcWorker](interfaces/SvcWorker.md)               | Service Worker interface that extends ServiceWorkerGlobalScope             |
| [SvcWorkerOptions](interfaces/SvcWorkerOptions.md) | Service Worker options for [createSvcWorker](functions/createSvcWorker.md) |
