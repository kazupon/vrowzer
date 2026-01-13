# @vrowser/service-worker

unplugin for `@vrowser/service-worker`

## ✨ Features

TOOD:

## 💿 Installation

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'

export default defineConfig({
  plugins: [ServiceWorker()],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import ServiceWorker from '@vrowser/unplugin-service-worker/rollup'

export default {
  plugins: [ServiceWorker()],
}
```

<br></details>

<details>
<summary>Rolldown / tsdown</summary><br>

```ts
// rolldown.config.ts / tsdown.config.ts
import ServiceWorker from '@vrowser/unplugin-service-worker/rolldown'

export default {
  plugins: [ServiceWorker()],
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
import { build } from 'esbuild'
import ServiceWorker from '@vrowser/unplugin-service-worker/esbuild'

build({
  plugins: [ServiceWorker()],
})
```

<br></details>

<details>
<summary>Webpack</summary><br>

```js
// webpack.config.js
import ServiceWorker from '@vrowser/unplugin-service-worker/webpack'

export default {
  /* ... */
  plugins: [ServiceWorker()],
}
```

<br></details>

<details>
<summary>Rspack</summary><br>

```ts
// rspack.config.js
import ServiceWorker from '@vrowser/unplugin-service-worker/rspack'

export default {
  /* ... */
  plugins: [ServiceWorker()],
}
```

<br></details>

## ⚙️ Options

TODO:

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
