# Function: disposeAllControllers()

Dispose all registered controllers.

This will clean up resources but will NOT terminate the service workers.
Use [terminateAllServiceWorkers](/packages/service-worker/docs/admin/functions/terminateAllServiceWorkers.md) to terminate service workers.

## Signature

```ts
export function disposeAllControllers(): void
```

## Returns

`void`

## Examples

```ts
import { disposeAllControllers } from '@vrowzer/service-worker/admin'

// Clean up all controllers on page unload
window.addEventListener('unload', () => {
  disposeAllControllers()
})
```
