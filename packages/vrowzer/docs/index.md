# API Documentation

Vrowzer - Preview with Vite HMR flavor for the browser

## Example

```ts
import { Vrowzer } from 'vrowzer'

const vrowzer = Vrowzer()

// Initialize with files
const ready = await vrowzer.ready({
  files: {
    '/main.js': `
      document.getElementById('app').innerHTML = '<h1>Hello!</h1>'
      if (import.meta.hot) { import.meta.hot.accept() }
    `
  }
})

if (ready) {
  // Mount preview iframe into a container element
  vrowzer.mount(document.getElementById('preview-container'), { id: 'preview' })
}

// Update files (triggers HMR)
vrowzer.updateFile(
  '/main.js',
  `
  document.getElementById('app').innerHTML = '<h1>Updated!</h1>'
  if (import.meta.hot) { import.meta.hot.accept() }
`
)
```

## Functions

| Function | Description |
| ------ | ------ |
| [Vrowzer](/packages/vrowzer/docs/default/functions/Vrowzer.md) | Factory function to create a [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) instance. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [PreviewContext](/packages/vrowzer/docs/default/interfaces/PreviewContext.md) | Context exposed to the mounted preview document. |
| [PreviewMountOptions](/packages/vrowzer/docs/default/interfaces/PreviewMountOptions.md) | Options for mounting a preview session. |
| [PreviewSession](/packages/vrowzer/docs/default/interfaces/PreviewSession.md) | A mounted preview iframe managed by a [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) instance. |
| [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) | The main interface for the Vrowzer preview environment. |
| [VrowzerConfig](/packages/vrowzer/docs/default/interfaces/VrowzerConfig.md) | VrowzerConfig defines the configuration options for [`Vrowzer.ready`](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-ready) |
| [VrowzerOptions](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md) | VrowzerOptions defines the configuration options for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md). |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [PreviewSessionRef](/packages/vrowzer/docs/default/type-aliases/PreviewSessionRef.md) | A preview session target accepted by lifecycle methods. |
| [VrowzerEventMap](/packages/vrowzer/docs/default/type-aliases/VrowzerEventMap.md) | Event map for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md). |

