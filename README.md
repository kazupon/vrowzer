<h1 align="center">Vrowzer</h1>

<p align="center">
  <img src="./assets/og-image.png" alt="Vrowzer" width="80%" />
</p>

<p align="center">
  <strong>Vite dev server in the Browser</strong>
</p>

<p align="center">
  <em>/vraʊ.zɛr/ — Vite + Browser, inspired from French pronounce</em>
</p>

> [!WARNING]
> This project is under active development and is not yet ready for production use. APIs and features may change without notice.

## 🐱 Motivation

- Bundlers like Vite achieve HMR through a dev server and WebSocket connection, providing a development experience with live preview while coding
- However, current HMR implementations are WebSocket-based, so there's no existing solution that uses an in-browser bundler like rolldown to deliver Vite-like high-performance preview experiences
- This project was created to enable efficient, high-performance live preview system for no-code/low-code products using rolldown

The following video shows an editor with a live preview built in a browser using Vrowzer:

<p align="center">
  <video src="https://github.com/user-attachments/assets/cc364c59-9305-4aaf-aadd-43262fbd3900" controls></video>
</p>

## 📦 Packages

| Package                                                                | Description                                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [vrowzer](./packages/vrowzer)                                          | Embeddable live preview system with HMR, powered by Vite dev server in the browser                                              |
| [@vrowzer/vite-plugin](./packages/vite-plugin)                         | Vite plugin for vrowzer                                                                                                         |
| [@vrowzer/vite-dev-server](./packages/vite-dev-server)                 | Vite dev server for vrowzer                                                                                                     |
| [@vrowzer/rolldown](./packages/rolldown)                               | Pre-bundled @rolldown/browser for easy browser usage                                                                            |
| [@vrowzer/fs](./packages/fs)                                           | Browser-compatible filesystem using memfs for vrowzer                                                                           |
| [@vrowzer/node-polyfill](./packages/node-polyfill)                     | Browser-compatible Node.js module polyfills for vrowzer                                                                         |
| [@vrowzer/service-worker](./packages/service-worker)                   | Safely deploy and manage Service Workers with version control, bidirectional communication, and emergency shutdown capabilities |
| [@vrowzer/service-worker-server](./packages/service-worker-server)     | Serverized service worker with the Node Server interface                                                                        |
| [@vrowzer/unplugin-service-worker](./packages/unplugin-service-worker) | unplugin for `@vrowzer/service-worker`                                                                                          |

## ✅ TODO

List is [here](TODO.md)

## 💖 Credits

This project is inspired and powered by:

- [`vite`](https://github.com/vitejs/vite), created by [Evan You](https://github.com/yyx990803) and Vite community
- [`rolldown`](https://rolldown.rs/), create by [VoidZero](https://voidzero.dev/) and community

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
