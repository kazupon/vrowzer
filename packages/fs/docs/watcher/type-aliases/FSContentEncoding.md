# Type Alias: FSContentEncoding

File content encoding type.
- 'text': UTF-8 string content (JS, TS, JSON, CSS, HTML, etc.)
- 'binary': ArrayBuffer content (images, WASM, fonts, etc.)

When encoding is 'binary', the content is an ArrayBuffer
and MUST be transferred via postMessage's transfer list
for zero-copy performance.

## Signature

```ts
export type FSContentEncoding = "text" | "binary"
```
