# Type Alias: ReloadSuggestReason

Reload suggest reason.

Reasons:
- 'unclaimed': Expected service worker is active but not controlling the page (no clients.claim())
- 'promoted': Expected service worker was in waiting, promoted to active, but not controlling the page

## Signature

```ts
export type ReloadSuggestReason = "unclaimed" | "promoted"
```
