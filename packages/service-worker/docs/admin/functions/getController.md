# Function: getController()

Get a controller by its script URL and version.

## Signature

```ts
export function getController(scriptURL: URL, version: string): SvcWorkerController | undefined
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `scriptURL` | `URL` | The service worker script URL (must be a URL object) |
| `version` | `string` | The service worker version |

## Returns

[`SvcWorkerController`](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) | `undefined` — The controller if found, undefined otherwise

## Examples

```ts
import { getController } from '@vrowzer/service-worker/admin'

const controller = getController(new URL('./sw.js', import.meta.url), 'v1.0.0')
if (controller) {
  console.log(`Found controller: ${controller.state}`)
}
```
