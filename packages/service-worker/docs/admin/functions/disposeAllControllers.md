[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / disposeAllControllers

# Function: disposeAllControllers()

```ts
function disposeAllControllers(): void;
```

Dispose all registered controllers

This will clean up resources but will NOT terminate the service workers.
Use [terminateAllServiceWorkers](terminateAllServiceWorkers.md) to terminate service workers.

## Returns

`void`

## Example

```typescript
import { disposeAllControllers } from '@vrowser/service-worker'

// Clean up all controllers on page unload
window.addEventListener('unload', () => {
  disposeAllControllers()
})
```
