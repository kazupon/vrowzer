# vrowzer

Vite dev server in the browser.

Embeddable live preview system with HMR support. Mount a Vite-powered preview iframe into your app with a simple API — no back-end server required.

## 💿 Installation

```sh
# npm
npm install vrowzer

# pnpm
pnpm add vrowzer

# yarn
yarn add vrowzer
```

You also need the Vite plugin:

```sh
pnpm add -D @vrowzer/vite-plugin
```

## 🚀 Usage

### 1. Configure Vite

```ts
// vite.config.ts
import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    Vrowzer({
      serviceWorkerEntry: './node_modules/vrowzer/dist/service-worker.ts'
    })
  ]
})
```

### 2. Use in your app

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
  vrowzer.mount(document.getElementById('preview-container'))
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

## 📖 API

### `Vrowzer(options?)`

Creates a new Vrowzer instance.

When `@vrowzer/vite-plugin` is used, configure the preview URL with the plugin's `basePath`. The value is shared with the application, Web Worker, and Service Worker, so the runtime option can be omitted:

```ts
// vite.config.ts
import { Vrowzer as VrowzerPlugin } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/app/',
  plugins: [VrowzerPlugin({ basePath: '/app/__preview__/' })]
})
```

```ts
// application.ts
import { Vrowzer } from 'vrowzer'

const vrowzer = Vrowzer()
```

The runtime `basePath` remains available for compatibility and for usage without the plugin. If both the plugin and runtime values are provided, their canonical paths must match or `Vrowzer()` throws. Without either value, the preview path is `/__preview__/`.

`serviceWorkerScope` controls which pages the browser allows the Service Worker to control. When `@vrowzer/vite-plugin` is used, configure the scope on the plugin so the registration and `Service-Worker-Allowed` response header use the same value. The runtime option can then be omitted:

```ts
// vite.config.ts
VrowzerPlugin({ serviceWorkerScope: '/app/' })

// application.ts
const vrowzer = Vrowzer()
```

The runtime `serviceWorkerScope` remains available for compatibility and for builds without the plugin. If both values are provided, they must match or `Vrowzer()` throws before registration. Without either value, the scope defaults to `/`. The scope does not set the preview URL; that is the role of `basePath`.

**Options:**

| Option                 | Type     | Default                           | Description                                       |
| ---------------------- | -------- | --------------------------------- | ------------------------------------------------- |
| `basePath`             | `string` | Plugin value or `'/__preview__/'` | Preview URL pathname; must match the plugin value  |
| `serviceWorkerVersion` | `string` | `'vrowzer-v1'`                    | SW version for cache management                   |
| `serviceWorkerScope`   | `string` | Plugin value or `'/'`             | SW registration scope; must match the plugin value |

### Instance Methods

#### `ready(config): Promise<boolean>`

Initializes the preview system: creates Web Worker and Service Worker, establishes a MessageChannel between them, and syncs initial files.

```ts
const ready = await vrowzer.ready({
  files: {
    '/main.js': 'console.log("hello")',
    '/style.css': 'body { color: red }'
  }
})
```

#### `mount(container): void`

Mounts a preview iframe into the given DOM element. The iframe uses `credentialless` and `sandbox="allow-scripts allow-same-origin"` attributes, and loads content via the Service Worker using a `srcdoc` bootstrap.

```ts
vrowzer.mount(document.getElementById('preview'))
```

#### `updateFile(path, content): void`

Updates a file in the virtual filesystem. Triggers HMR if the preview supports it.

```ts
vrowzer.updateFile('/main.js', 'console.log("updated")')
```

#### `addFile(path, content): void`

Adds a new file to the virtual filesystem.

#### `deleteFile(path): void`

Deletes a file from the virtual filesystem.

#### `reloadPreview(): void`

Reloads the preview iframe.

## 🏗️ Architecture

![Architecture](./assets/architecture.svg)

## 📚 API References

See the [API References](./docs/index.md)

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
