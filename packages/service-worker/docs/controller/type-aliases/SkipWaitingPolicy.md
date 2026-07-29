# Type Alias: SkipWaitingPolicy

Skip waiting policy.

Policies:
- 'strict': request `skipWaiting` only if `waiting` / `installing` matches expected service worker version
- 'force': if `registration.waiting` exists, ALWAYS request `skipWaiting` (even if version differs)

## Signature

```ts
export type SkipWaitingPolicy = "strict" | "force"
```
