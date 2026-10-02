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

// Update files (triggers HMR). The promise resolves when later preview requests see the change.
await vrowzer.updateFile(
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

## Classes

| Class | Description |
| ------ | ------ |
| [VrowzerBuildError](/packages/vrowzer/docs/default/classes/VrowzerBuildError.md) | The error of a [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build) that failed: an error in the project, or an option that the browser build does not support. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [PreviewContext](/packages/vrowzer/docs/default/interfaces/PreviewContext.md) | Context exposed to the mounted preview document. |
| [PreviewLoadErrorInfo](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) | Information about a preview document that failed to load before its application code started. |
| [PreviewMountOptions](/packages/vrowzer/docs/default/interfaces/PreviewMountOptions.md) | Options for mounting a preview session. |
| [PreviewSession](/packages/vrowzer/docs/default/interfaces/PreviewSession.md) | A mounted preview iframe managed by a [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) instance. |
| [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) | The main interface for the Vrowzer preview environment. |
| [VrowzerBuildLibraryOptions](/packages/vrowzer/docs/default/interfaces/VrowzerBuildLibraryOptions.md) | The library options of [VrowzerBuildOptions.build](/packages/vrowzer/docs/default/interfaces/VrowzerBuildOptions.md#property-build), a subset of Vite's `build.lib`. |
| [VrowzerBuildLog](/packages/vrowzer/docs/default/interfaces/VrowzerBuildLog.md) | A log of [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build): an error or a warning. |
| [VrowzerBuildOptions](/packages/vrowzer/docs/default/interfaces/VrowzerBuildOptions.md) | Options for [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build): a subset of the Vite config. |
| [VrowzerBuildResult](/packages/vrowzer/docs/default/interfaces/VrowzerBuildResult.md) | The result of [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build). |
| [VrowzerConfig](/packages/vrowzer/docs/default/interfaces/VrowzerConfig.md) | VrowzerConfig defines the configuration options for [`Vrowzer.ready`](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-ready) |
| [VrowzerOptions](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md) | VrowzerOptions defines the configuration options for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md). |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [PreviewSessionRef](/packages/vrowzer/docs/default/type-aliases/PreviewSessionRef.md) | A preview session target accepted by lifecycle methods. |
| [VrowzerEventMap](/packages/vrowzer/docs/default/type-aliases/VrowzerEventMap.md) | Event map for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md). |

