[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerControllerState

# Type Alias: SvcWorkerControllerState

```ts
type SvcWorkerControllerState =
  | "installing"
  | "waiting"
  | "activating"
  | "activated"
  | "suspended"
  | "terminated";
```

[Service Worker Controller](../interfaces/SvcWorkerController.md) state

Note that while it's similar to the state provided by ServiceWorkerState \| service worker state, it's not identical.
It has been adjusted to be easier for the Service worker controller to handle the expected service worker.

State changes timings:

- `'installing'`: When expected service worker is detected in installing state
- `'waiting'`: When expected service worker is detected in waiting state, or when installing → waiting transition occurs
- `'activating'`: When installing service worker skips waiting and transitions directly to activating state
- `'activated'`: When any of the following occurs:
  - Fast path, expected service worker is already the controller
  - Expected service worker becomes the controller after promotion
  - Installing service worker skips waiting and transitions directly to activated state
  - Expected service worker is active but not yet controlling the page (reload suggested)
- `'suspended'`: Service worker functionality is temporarily disabled (soft kill / circuit breaker engaged)
- `'terminated'`: Service worker has been unregistered (hard kill / circuit breaker tripped)

State transitions:

- `activated` → `suspended`: suspend() called (soft kill / circuit breaker engaged)
- `activated` → `terminated`: terminate() called (hard kill / circuit breaker tripped)
- `suspended` → `activated`: resume() called (circuit breaker disengaged)
- `suspended` → `terminated`: terminate() called (hard kill / circuit breaker tripped)
