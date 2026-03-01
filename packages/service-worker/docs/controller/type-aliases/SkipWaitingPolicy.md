[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SkipWaitingPolicy

# Type Alias: SkipWaitingPolicy

```ts
type SkipWaitingPolicy = "strict" | "force";
```

Skip waiting policy.

Policies:
- 'strict': request `skipWaiting` only if `waiting` / `installing` matches expected service worker version
- 'force': if `registration.waiting` exists, ALWAYS request `skipWaiting` (even if version differs)
