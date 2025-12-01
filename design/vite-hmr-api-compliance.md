# Vite HMR API Compliance Report

## Overview

This document compares the current HMR implementation in `packages/playground/src/preview/runtime.ts` against Vite's official HMR API specification.

## Current Implementation

```typescript
interface HotContext {
  data: Record<string, unknown>;
  accept(cb?: (mod?: unknown) => void): void;
  dispose(cb: (data: Record<string, unknown>) => void): void;
}
```

## Vite HMR API Specification

Reference: <https://vite.dev/guide/api-hmr.html>

### Full API

```typescript
interface ViteHotContext {
  // Data persistence across updates
  readonly data: any;

  // Accept updates
  accept(): void;
  accept(cb: (mod: ModuleNamespace | undefined) => void): void;
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void;
  accept(
    deps: readonly string[],
    cb: (mods: Array<ModuleNamespace | undefined>) => void,
  ): void;

  // Cleanup
  dispose(cb: (data: any) => void): void;
  prune(cb: (data: any) => void): void;

  // Control
  invalidate(message?: string): void;

  // Events
  on<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void;
  off<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void;
  send<T extends CustomEventName>(
    event: T,
    data?: InferCustomEventPayload<T>,
  ): void;
}
```

## Compliance Comparison

| API                    | Vite Signature                                    | Current Implementation                                | Status             |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------- | ------------------ |
| `data`                 | `readonly data: any`                              | `data: Record<string, unknown>`                       | ✅ Compliant       |
| `accept()`             | 4 overloads (see below)                           | 1 overload only                                       | ⚠️ Partial         |
| `dispose(cb)`          | `(cb: (data: any) => void): void`                 | `(cb: (data: Record<string, unknown>) => void): void` | ✅ Compliant       |
| `prune(cb)`            | `(cb: (data: any) => void): void`                 | -                                                     | ❌ Not Implemented |
| `invalidate(message?)` | `(message?: string): void`                        | -                                                     | ❌ Not Implemented |
| `on(event, cb)`        | `<T extends CustomEventName>(event, cb): void`    | -                                                     | ❌ Not Implemented |
| `off(event, cb)`       | `<T extends CustomEventName>(event, cb): void`    | -                                                     | ❌ Not Implemented |
| `send(event, data?)`   | `<T extends CustomEventName>(event, data?): void` | -                                                     | ❌ Not Implemented |

## `accept()` Overloads Detail

| Vite Signature                     | Purpose                      | Current Status                |
| ---------------------------------- | ---------------------------- | ----------------------------- |
| `accept(): void`                   | Self-accept without callback | ⚠️ Supported (cb is optional) |
| `accept(cb: (mod) => void): void`  | Self-accept with callback    | ✅ Supported                  |
| `accept(dep: string, cb): void`    | Accept single dependency     | ❌ Not Supported              |
| `accept(deps: string[], cb): void` | Accept multiple dependencies | ❌ Not Supported              |

## Summary

### Implemented Features (3/8)

- ✅ `data` - State persistence across updates
- ✅ `accept(cb?)` - Self-accepting modules
- ✅ `dispose(cb)` - Cleanup before update

### Missing Features (5/8)

- ❌ `accept(dep, cb)` - Dependency accept
- ❌ `accept(deps, cb)` - Multiple dependencies accept
- ❌ `prune(cb)` - Cleanup when module is removed
- ❌ `invalidate(message?)` - Force HMR propagation
- ❌ `on/off/send` - Custom event system

## Recommendations

### For PoC (Current State)

The current implementation is **sufficient for basic HMR functionality**:

- Self-accepting modules work
- State preservation works
- Cleanup via dispose works

### For Vite Compatibility

To achieve full Vite HMR API compatibility, implement in priority order:

1. **High Priority**
   - `accept(dep, cb)` / `accept(deps, cb)` - Required for dependency-based HMR
   - `prune(cb)` - Important for proper cleanup

2. **Medium Priority**
   - `invalidate()` - Useful for forcing updates

3. **Low Priority** (requires server communication)
   - `on(event, cb)` - Custom events
   - `off(event, cb)` - Event removal
   - `send(event, data)` - Send to server

## Implementation Notes

### Dependency Accept Pattern

```typescript
// Vite usage
import.meta.hot.accept("./dep.js", (newDep) => {
  // Handle dependency update
});

// Requires tracking import graph
```

### Prune Pattern

```typescript
// Called when module is no longer imported
import.meta.hot.prune((data) => {
  // Final cleanup
});
```

### Event System

The `on/off/send` methods require a connection to the dev server for custom events like:

- `vite:beforeUpdate`
- `vite:afterUpdate`
- `vite:beforeFullReload`
- `vite:error`
- Custom user events
