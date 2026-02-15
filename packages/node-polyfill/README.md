# @vrowser/node-polyfill

Browser-compatible Node.js module polyfills for vrowser.

## Features

- Individual subpath exports for tree-shaking
- Browser / Service Worker ready
- Full `EventEmitter` with Node.js v23+ features
- ANSI cursor/clear functions for `readline`
- Promise-based timer APIs with `AbortSignal` support
- TypeScript support with full type definitions

## 💿 Installation

```sh
# npm
npm install --save @vrowser/node-polyfill

# pnpm
pnpm add @vrowser/node-polyfill

# yarn
yarn add @vrowser/node-polyfill

# deno
deno add npm:@vrowser/node-polyfill

# bun
bun add @vrowser/node-polyfill
```

## 🚀 Usage

### Direct Usage

```ts
import { EventEmitter, once, on } from '@vrowser/node-polyfill/events'
import { clearLine, cursorTo, createInterface } from '@vrowser/node-polyfill/readline'
import { setTimeout as delay } from '@vrowser/node-polyfill/timers/promises'

const ee = new EventEmitter()
ee.on('data', msg => console.log(msg))
ee.emit('data', 'hello')

// Promise-based once
const [value] = await once(ee, 'result')

// Async timer
await delay(1000, 'done')
```

### As Node.js Module Polyfill (Vite/Vitest/Rolldown)

```ts
// vite.config.ts / vitest.config.ts / rolldown.config.ts
export default defineConfig({
  resolve: {
    alias: {
      'node:url': '@vrowser/node-polyfill/url',
      'node:util': '@vrowser/node-polyfill/util',
      'node:events': '@vrowser/node-polyfill/events',
      'node:perf_hooks': '@vrowser/node-polyfill/perf_hooks',
      'node:os': '@vrowser/node-polyfill/os',
      'node:dns': '@vrowser/node-polyfill/dns',
      'node:dns/promises': '@vrowser/node-polyfill/dns/promises',
      'node:process': '@vrowser/node-polyfill/process',
      'node:readline': '@vrowser/node-polyfill/readline',
      'node:timers': '@vrowser/node-polyfill/timers',
      'node:timers/promises': '@vrowser/node-polyfill/timers/promises'
    }
  }
})
```

## API

### Entry Points

| Entry Point                              | Node.js Module         | Description                                                                                       |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `@vrowser/node-polyfill/url`             | `node:url`             | `fileURLToPath`, `pathToFileURL`, `URL`                                                           |
| `@vrowser/node-polyfill/util`            | `node:util`            | `promisify`, `inspect`, `stripVTControlCharacters`                                                |
| `@vrowser/node-polyfill/events`          | `node:events`          | `EventEmitter`, `once`, `on`, `addAbortListener`, `getEventListeners`                             |
| `@vrowser/node-polyfill/perf_hooks`      | `node:perf_hooks`      | `performance`, `PerformanceObserver`, stubs for `monitorEventLoopDelay`, `createHistogram`        |
| `@vrowser/node-polyfill/os`              | `node:os`              | `endianness`, `hostname`, `platform`, `availableParallelism`, stubs for `getPriority`, `userInfo` |
| `@vrowser/node-polyfill/dns`             | `node:dns`             | Stub implementations for all DNS APIs                                                             |
| `@vrowser/node-polyfill/dns/promises`    | `node:dns/promises`    | Promise-based DNS stubs                                                                           |
| `@vrowser/node-polyfill/process`         | `node:process`         | `cwd`/`chdir`, `nextTick`, `hrtime`, `env`, `stdout`/`stderr`/`stdin` stubs                       |
| `@vrowser/node-polyfill/readline`        | `node:readline`        | ANSI cursor/clear, `Interface`, promises API with `Readline` utility                              |
| `@vrowser/node-polyfill/timers`          | `node:timers`          | `setTimeout`/`setInterval`, `setImmediate` (MessageChannel fallback)                              |
| `@vrowser/node-polyfill/timers/promises` | `node:timers/promises` | Promise `setTimeout`/`setImmediate`, async iterator `setInterval`, `scheduler`                    |

### Implementation Notes

**Fully implemented** (browser-native or equivalent):

- `url` - `fileURLToPath`/`pathToFileURL` with Windows path support
- `events` - Complete `EventEmitter` with `captureRejections`, `errorMonitor`, async `once`/`on`, `addAbortListener`
- `perf_hooks` - Browser-native `performance`, `PerformanceObserver` via `globalThis`
- `readline` - ANSI escape sequences for terminal control, `Interface` with async iteration
- `timers` - Native re-exports with `setImmediate` polyfill via `MessageChannel`
- `timers/promises` - Promise/AsyncIterator APIs with `AbortSignal` support

**Stub implementations** (browser-safe defaults):

- `os` - Returns browser defaults (`platform: 'browser'`, `arch: 'javascript'`)
- `dns` - Returns stub values (`127.0.0.1` for `lookup`, empty arrays for `resolve*`)
- `process` - Minimal process with `cwd`/`chdir`, `env`, `nextTick`, `hrtime.bigint()`

## 🤝 Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg">
    <img alt="sponsor" src='https://cdn.jsdelivr.net/gh/kazupon/sponsors/sponsors.svg'/>
  </a>
</p>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
