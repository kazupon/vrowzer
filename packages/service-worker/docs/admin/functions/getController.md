[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / getController

# Function: getController()

```ts
function getController(scriptURL, version): 
  | SvcWorkerController
  | undefined;
```

Get a controller by its script URL and version.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `scriptURL` | `URL` | The service worker script URL (must be a URL object) |
| `version` | `string` | The service worker version |

## Returns

  \| [`SvcWorkerController`](../../controller/interfaces/SvcWorkerController.md)
  \| `undefined`

The controller if found, undefined otherwise

## Example

```ts
import { getController } from '@vrowser/service-worker/admin'

const controller = getController(new URL('./sw.js', import.meta.url), 'v1.0.0')
if (controller) {
  console.log(`Found controller: ${controller.state}`)
}
```
