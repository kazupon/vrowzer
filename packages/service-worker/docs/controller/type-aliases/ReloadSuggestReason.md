[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / ReloadSuggestReason

# Type Alias: ReloadSuggestReason

```ts
type ReloadSuggestReason = "unclaimed" | "promoted";
```

Reload suggest reason.

Reasons:

- 'unclaimed': Expected service worker is active but not controlling the page (no clients.claim())
- 'promoted': Expected service worker was in waiting, promoted to active, but not controlling the page
