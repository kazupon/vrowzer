# Type Alias: FSContentEncoding

File content encoding type.
- 'text': UTF-8 string content (JS, TS, JSON, CSS, HTML, etc.)
- 'binary': ArrayBuffer content (images, WASM, fonts, etc.)

When encoding is 'binary', the content is an ArrayBuffer.
The publisher transfers a copy of it to each target via postMessage's transfer list,
so the caller's ArrayBuffer stays usable.

## Signature

```ts
export type FSContentEncoding = "text" | "binary"
```
