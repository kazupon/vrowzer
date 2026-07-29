# Function: getAllControllers()

Get all registered service worker controllers.

## Signature

```ts
export function getAllControllers(): readonly SvcWorkerController[]
```

## Returns

`readonly` [`SvcWorkerController`](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md)\[\] — A readonly array of all registered controllers

## Examples

```ts
import { getAllControllers } from '@vrowzer/service-worker/admin'

const controllers = getAllControllers()
for (const controller of controllers) {
  console.log(`${controller.scriptURL} (${controller.version}): ${controller.state}`)
}
```
