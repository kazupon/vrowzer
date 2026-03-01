[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / getAllControllers

# Function: getAllControllers()

```ts
function getAllControllers(): readonly SvcWorkerController[];
```

Get all registered service worker controllers.

## Returns

readonly [`SvcWorkerController`](../../controller/interfaces/SvcWorkerController.md)[]

A readonly array of all registered controllers

## Example

```ts
import { getAllControllers } from '@vrowser/service-worker/admin'

const controllers = getAllControllers()
for (const controller of controllers) {
  console.log(`${controller.scriptURL} (${controller.version}): ${controller.state}`)
}
```
